# Therapist UAT Feedback — Triage & Fix Plan (2026-07-02)

**Source:** Same practitioner who reported the PDF severity-overlap bug (quick task 260702-bg4).
**Status:** Structured & grounded against the codebase. Awaiting: (a) 2 photos (F6, F7), (b) Ben's product decisions on F2/F4/F5/F8/F10.

> ⭐ **THIS IS THE LIVING MASTER TRACKER for the therapist's UAT feedback.** Revisit it whenever picking up new TPM work so parked/deferred items (F1, F2, F4, F7, F8, F9, F10) aren't lost. Mirrored in memory: `project-therapist-uat-2026-07-02.md`. Update the statuses here as items are handled.
>
> **Current status (2026-07-02):** F6+F5 → **GSD phase started** (covered). F3 → **handoff written** (`2026-07-02_f3-view-sessions-label-HANDOFF.md`), run after Phase 36. F7 → awaiting photo (likely already fixed by 260702-bg4). Everything else parked/deferred/dropped per below.
**Context:** Code anchors verified by exploration on 2026-07-02. All file:line refs are current as of `main` @ 07d9fc9.

> **Deployment note:** All fixes only reach the practitioner after a deploy + service-worker cache update (see MEMORY: reference-pwa-sw-cache-updates / reference-sw-version-update-delivery). Even already-fixed items (F7) won't help her until this ships.

---

## Routing summary

| ID | Item | Type | Effort | Ready? |
|----|------|------|--------|--------|
| F3 | "View sessions" clock button unlabeled | UX quick win | S | ✅ ready now |
| F1 | Can't figure out how to use snippets | Discoverability (feature is built) | S–M | ✅ ready now |
| F9 | Heart-Shield "released" bubble should name the emotion(s) | Feature (data exists) | M | ✅ ready now |
| F6 | Date discrepancy / off-by-one on back-dated sessions | **Bug (trust-critical)** | M | ⏳ needs photo to confirm; hypothesis strong |
| F7 | PDF severity overlaps "reason for referral" | **Bug — likely already fixed today** | — | ⏳ needs photo to confirm vs 260702-bg4 |
| F4 | More session types (Remote, Proxy, custom) | Feature | S–M | ❓ needs type-list decision |
| F5 | American (month-first) date option | Feature | M | ❓ needs intent clarification |
| F2 | Rich text in note boxes (indent/bullets/color) | Feature | M–L | ❓ needs scope decision |
| F8 | Heart Shield workflow (separate session? mid-session?) | Product question | — | ❓ needs product guidance |
| F10 | Store documents (consent/billing/payments) | New subsystem | L | ❓ roadmap decision |

**Proposed batches (superseded — see decisions below).**

---

## Ben's decisions — 2026-07-02

> **HARD RULE: plan first, do NOT execute anything until the plan is approved.**

- **F6 + F5 = the priority.** ✅ **GSD phase started 2026-07-02** (this item is now covered by that phase — discuss/plan/execute lives there). Acceptance for F6: **all date parsing/formatting consistent to LOCAL, app-wide, agent-verified**. F5: user date-format setting (incl. numeric US/EU) + adapt the client birth-date 3-dropdown ordering. Supporting docs: `2026-07-02_f6-f5-date-consistency-PLAN-PROPOSAL.md`, `2026-07-02_f6-f5-discuss-phase-HANDOFF.md`.
- **F3** — ✅ **handoff written** (`2026-07-02_f3-view-sessions-label-HANDOFF.md`). Quick task; **run after Phase 36** (overview.js is in Phase 36's comment-only scope).
- **F4 — DEFERRED.** And re-framed: session types should be **managed in Settings**, not hardcoded per-session. Revisit as a settings-driven list later.
- **F10 — DROPPED.** Not a direction for this product.
- **F2 — PENDING.** Ben wants to know *where* this would live (main session window?) before deciding scope. See F2 section — answer added.
- **F1, F9 — parked** for now (not rejected; just not this batch).
- **F7** — still pending her photo; likely already fixed by 260702-bg4.
- **F8** — answer/guidance only, no build decided.

**Next step (planning, read-only):** a comprehensive **date-handling audit** enumerating every store/parse/format site across all modules (db.js, add-session.js, overview.js, sessions.js, app.js, export-modal.js, pdf-export.js, and any others), so the F6+F5 plan is built on a complete map — not the partial list below. Then define the canonical date policy → then a GSD plan for review.

---

## Bugs

### F6 — Date discrepancy on back-dated sessions ⚠️ trust-critical
> "I tried to back date a session and now the two dates on the home/session page don't match. And I swear they keep changing but I can't prove it." (photo coming)

**Current behavior (grounded):**
- A session has 3 date fields: `date` (user-editable session date, back-datable), `createdAt` (`new Date().toISOString()` on insert), `updatedAt` (on every edit). Written at `add-session.js:1123-1158`.
- **Only `date` is ever shown in the UI** — home (`overview.js:382,420,487`), all-sessions (`sessions.js:92`), session title (`add-session.js:1494`). `createdAt`/`updatedAt` are never displayed (sort tiebreakers only).
- **Two formatters that disagree on parsing:**
  - `App.formatDate` (`app.js:940-958`) parses `new Date("YYYY-MM-DD")` → **UTC midnight**.
  - `pdf-export.js formatDate` (`674-689`) parses `new Date(sessionDate + "T00:00:00")` → **local midnight**.
- The PDF also renders an **"Exported on"** date = `App.formatDate(new Date())` computed at export time (`export-modal.js:605`, label `pdf.footer.exportedOn` at `pdf-export.js:1846-1849`). This legitimately changes every export (by design, D-09).

**Root-cause hypothesis:**
1. **Off-by-one (the "don't match"):** UI uses UTC parse; for a user in a negative-UTC (American) timezone, `new Date("2026-07-02")` is `2026-07-01 19:00` local, and `Intl.DateTimeFormat` (local tz) renders it as **Jul 1** — one day before what she picked. The PDF's local-midnight parse renders **Jul 2**. UI vs PDF disagree; and even the date-input default (`sessionDate.valueAsDate = new Date()`, `add-session.js:516`, UTC-based) can seed an off-by-one.
2. **"Keeps changing":** the PDF "Exported on" line (`new Date()`), which she may be reading as the session date.

**Proposed fix direction (confirm after photo):** make date parsing timezone-safe and consistent — parse `YYYY-MM-DD` as a **local** date in `App.formatDate` (or format with an explicit `timeZone:'UTC'`), so UI and PDF agree and back-dated days render as picked regardless of the user's timezone. Unify the two formatters' parse logic. Keep "Exported on" as-is but consider labeling it more clearly so it's not mistaken for the session date.
**Anchors:** `app.js:940-958`, `pdf-export.js:674-689`, `export-modal.js:605`, `add-session.js:516`.
**Verify:** falsifiable test with a fake negative-UTC timezone (e.g. TZ=America/New_York): a session stored as `2026-07-02` renders "Jul 2" in UI and PDF alike.

### F7 — PDF severity overlaps "reason for referral" — LIKELY ALREADY FIXED
> "I created a session report PDF and the severity levels overlap the reason for referral." (photo coming)

**Read:** "severity levels" = the before/after bars; "reason for referral" = the emotion-name text she typed. This is almost certainly the exact overlap fixed **today** in quick task 260702-bg4 (`a5eef6f`: long severity emotion names now wrap instead of drawing under the bars). She is on the deployed version, which predates the fix.
**Action:** confirm against her photo. If same → no code work, just deploy. If it's a *distinct* field/section overlapping → new bug, scope separately. (There is no separate "reason for referral" field in the schema — the issue text is `issue.name` — which supports the "same bug" read.)

---

## Ready-now (Batch A)

### F3 — "View sessions" clock button is unlabeled
> "Hard to find the button to view previous sessions. Small button with a clock. Maybe an actual word like 'view sessions'."

**Current:** icon-only clock button on the home client row (`overview.js:425-430`). Has `title` + `aria-label` from i18n `overview.table.previousSessions` ("Previous sessions", localized 4 langs) but **no visible text**.
**Fix:** add a visible text label beside the clock icon (reuse the existing `overview.table.previousSessions` key, or a shorter "View sessions" variant). Small CSS/markup change; label already localized.
**Anchors:** `overview.js:425-441`; i18n `overview.table.previousSessions` (`i18n-*.js:26`).

### F1 — Snippets discoverability
> "I can't figure out how to use text snippets… familiar with the idea [EC practitioner ext.] but can't figure out the process here."

**Current:** the engine is solid (3 prior quick tasks). Session note textareas (`add-session.html:247-346`) carry `data-snippets="true"` and expand on typing a trigger like `;anger `. **But all help lives on the Settings → Text Snippets page** (`snippets.section.helper` etc.); there is **zero in-context hint** near the session textareas, and **no onboarding/tour system** exists anywhere. The only runtime cue is the autocomplete popover, which appears *after* she already types the prefix — so a first-timer never discovers it.
**Fix (discoverability, not functionality):** add an in-context hint at the session note fields — e.g. a small help/info affordance or one-line hint ("Type `;` + a trigger to insert a saved snippet — set them up in Settings") near the note textareas, and/or enrich the placeholder. Keep it dismissible/unobtrusive. Consider a first-run coachmark later, but the cheap win is the inline hint.
**Anchors:** `add-session.html:247,265,278,291,304,333,346` (note fields); `snippets.js:416-436` (input handler); existing help keys `snippets.section.helper` (`i18n-en.js:500`).

### F9 — Heart-Shield "released" bubble should name the emotion(s)
> "In the sessions list a green bubble shows the HS was released. Nice to list which emotion it was — could be multiples."

**Current:** the badge is **status-only** — `overview.js:498-509` and `sessions.js:123-137` render `.heartwall-badge` with text = `sessions.badge.removed`/"Removed" (green) or `.active`/"Active" (pink), driven by the `shieldRemoved` boolean. The emotion text she typed (`heartShieldEmotions`, `add-session.html:247`) **is stored** on the record but never surfaced in the badge (only in the form + PDF).
**Fix:** surface `heartShieldEmotions` in/beside the released badge (e.g. append the emotion name, or first emotion + "+N" with a tooltip for multiples; degrade gracefully when empty). Self-contained; data already exists.
**Anchors:** `overview.js:498-509`, `sessions.js:123-137`; data field `heartShieldEmotions` (`add-session.js:1107,1130,1149`); css `.heartwall-badge` (`app.css:940-963`).

---

## Features — need a decision (Batch C)

### F4 — More session types + custom
> "Add more types of sessions — Remote, proxy, other/create your own."

**Current:** 3 hardcoded radio "toggle cards" in `add-session.html:77-90` — `clinic` (displays "In-person"), `online`, `other`. Two i18n key families: `session.form.*` and `session.type.*` (4 locales each). Display via `App.formatSessionType` (`app.js:1207-1210`). **No custom/free-text option** anywhere.
**Decision needed:** (a) which fixed types to add (Remote, Proxy, …)? (b) support a free-text "create your own" type? Custom adds storage + PDF-label handling for arbitrary strings.
**Effort:** fixed additions = S (HTML + 2 i18n families × 4 locales). Custom free-text = M (read/save at `add-session.js:1104-1105`/`729-734`, display fallback, PDF).

### F5 — American (month-first) date option
> "I use the American way with the month first. Maybe have an option."

**Current:** `App.formatDate` maps `currentLang`→locale; **en-US already renders month-first** ("Jul 2, 2026"). So if her app language is English she already gets US ordering — which suggests she may want a **numeric MM/DD/YYYY** format specifically, or her app is set to a non-English language.
**Decision needed:** clarify intent — (a) add a numeric `MM/DD/YYYY` vs `DD/MM/YYYY` toggle in Settings, or (b) it's really the F6 off-by-one making dates look wrong (fix F6 first and re-check). Likely intertwined with F6.
**Effort:** M — a Settings preference + both formatters (`app.js:940-958`, `pdf-export.js:674-689`).

### F2 — Rich text in the note boxes
> "Trapped Emotions Released / text boxes — I'd love to indent, tab, bullet point, color code inside the text box."

**Current:** the note fields are **plain `<textarea>`s with no live preview**. Markdown is rendered only downstream (export preview `export-modal.js:510-512` via `MdRender.render`, and the PDF via `parseMarkdown`). `MdRender` (`md-render.js:24-65`) supports headings, **bold/italic**, and **unordered bullet lists (`- `/`* `)** — so *bullets already work*, she just can't see them because the note fields have no preview. **Not supported:** ordered/numbered lists (in md-render — note pdf-export was separately patched for these), nested/indented lists, tabs, colors.
**Decision needed:** scope — (a) cheap: add a live markdown preview to note fields + a one-line formatting hint (unlocks bullets/bold she already has); or (b) expensive: a real rich-text editor with indentation + color coding (new editor component, new storage format, PDF renderer changes). Color coding is genuinely new work.
**Effort:** (a) S–M, (b) L.

---

## Product / roadmap (Batch D)

### F8 — Heart Shield workflow (product question, not a bug)
> "Are Heart Shields separate sessions? What if one comes up mid-regular-session? Maybe a special snippet, or you make an icon/button."

**Current model:** a Heart Shield is **not** a separate session — it's a boolean flag on a normal session: `isHeartShield` toggle (`add-session.html:214-223`), with `shieldRemoved` (yes/no, required when flagged) and a `heartShieldEmotions` free-text field. So the app *already* supports "a Heart Shield came up in this session" via the toggle + emotions field.
**Action:** this is mostly a **guidance/answer** to her ("yes — just toggle Heart Shield on the regular session and list the emotions"), plus an optional UX nudge (make the toggle/emotions more discoverable, à la F1). Decide whether any build is warranted beyond answering + F9.

### F10 — Document storage (consent forms, billing, payments)
> "Have you thought of a place to include PDFs/documents like consent forms, billing info, payments?"

**Current:** nothing exists. This is a **new subsystem**: per-client file attachments (IndexedDB blob storage in this offline PWA — size/quota considerations), document categories, and possibly a payments/billing model. Milestone-scale; needs real product scoping.
**Decision needed:** roadmap it as a future milestone (recommended) vs scope now vs drop.

---

## Open dependencies
- **Photos:** F6 (the mismatched dates) and F7 (the PDF overlap) — needed to confirm before finalizing those fixes.
- **Ben's decisions:** F4 (type list + custom?), F5 (numeric format vs F6-first), F2 (preview-only vs full editor), F8 (build anything?), F10 (roadmap?).
