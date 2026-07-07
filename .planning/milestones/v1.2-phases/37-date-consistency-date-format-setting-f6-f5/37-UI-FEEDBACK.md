# Phase 37 — Personalization UI feedback (Ben, UAT 2026-07-03)

Captured from live use of `settings.html?tab=personalize` + add-session. Screenshot: `.claude/image-cache/.../2.png`.

## 1. Date-format dropdown (F5 picker) — looks old-fashioned
- The native `<select>` looks dated: no rounded corners, and it's **very wide** despite short option text.
- SAME problem on the **Backups tab** backup-frequency `<select>` — treat both together (shared restyle).
- Shrinking width alone may also look off — needs a proper modern control, not just a width tweak.
- Dates themselves render fine. Scope = the control's styling.

## 2. Session-type editor (F4) — current design is confusing; redesign
Current: lock icon + always-editable text box for every row + lock button on the right.
**Wanted:**
- **Locked (default) rows:** grayed out / read-only by default. A small **Edit (pencil) icon** on the right, SAME size as the custom rows' delete icon. Click Edit → that ONE line becomes renameable. No more "everything editable at once."
- **Remove the lock symbol entirely.**
- Add a small **circular ⓘ info** control (hover/click) that explains "default session types can be renamed but not deleted." Reuse the app's existing info-icon/tooltip pattern (exists elsewhere — FIND + reuse).
- Net per locked row: [grayed label] [✎ Edit] [ⓘ info]. Custom row: [label] [✎ Edit] [🗑 Delete].

## 3. BUG — custom-row delete icon wraps to its own line
- In the screenshot, the trash icon for custom types ("jkjk", "hhghjg") drops to a **separate line below** the text box instead of sitting inline to the right. Layout/flex bug — must be inline on the same row.

## 4. "Add type" control + new-type textbox are too wide / wrong interaction
- Currently: an always-present wide text box + a very wide "Add" button.
- **Wanted:** a compact **"Add type" button**. Click it → reveals a text box with a small **Save** button next to it. No persistent always-there textbox. (reveal-on-demand pattern)

## 5. add-session session-type selector does NOT scale (needs mockups — decide together)
- The green radio "bubbles/pills" look great at 5 types, but with more types the first row (session type/location) wraps to **3 lines** while Client and Session-date rows stay 1 line — disproportional / unbalanced form.
- Do NOT fall back to the old-fashioned dropdown.
- Keep the pill aesthetic but constrain it — e.g. horizontal scroll inside a single-row strip, or wrap with a max-height + internal scroll, or show-more.
- **Ben wants to see mockups and decide together.**

## 6. Personalization must be the FIRST Settings tab
- Currently inserted after the Fields tab. Move it to position 1 (first tab). Update tab order + default-tab logic in settings.html / settings.js.

## 7. Rename add-session "Session Location" → "Session Type"
- The add-session field currently labeled **"Session Location"** IS the session-type selector (In-person/Online/Remote/Proxy/Other). Wrong name — it must read **"Session Type"** to match the Settings "Session types". Rename the label + its i18n keys across EN/HE/DE/CS. (Confirm no other real "location" field exists that this would clash with.)

## 8. Add-session dropdowns → rounded style (Item 1 Option A treatment)
- The add-session **Client** picker (and the native date field) must get the same rounded, content-width select style as the date-format/backup-frequency controls — otherwise mismatch. Ben: "there is already a mismatch now, but if we already touch add-session, might as well." Apply the shared modern-select class.

## 9. Session-types editor — REUSE the "Custom field names" + Revert pattern (SUPERSEDES items 2–4 pencil design)
- Ben reconsidered: don't invent a pencil/grey design. Reuse the EXISTING Fields-tab component (settings.js:200-288, `.settings-row` / `.reset-row-btn` / `.settings-locked-info`, key `settings.row.revert.label`).
- Built-in types: editable name input + **Revert** button (icon + "Revert" label; disabled until overridden; restores the default name) + **ⓘ** info ("renamable, not deletable"). No lock symbol, no pencil.
- Custom types: editable name input + **Delete** (keeps the just-landed warn+reassign-to-Other on delete).
- Add type: reveal field + Save (item 4 unchanged).
- Open sub-decision: immediate-apply (chosen, matches the date picker in this tab) vs Fields-style Save/Discard batch bar (pending Ben's confirm).

## DECISIONS (confirmed by Ben)
- Item 1: Option A (rounded, content-width dropdown) — date-format + backup-frequency.
- Items 2–4: SUPERSEDED by Item 9 (revert pattern).
- Item 5 & 7: Option C (common few + "More"); rename "Session Location" → "Session Type".
- Item 6: Personalization = first tab.
- Item 8: add-session Client dropdown → rounded style.
- Item 9: revert pattern (awaiting confirm on immediate-vs-Save/Discard).

## 10. (Deferred to handoff) Main-page dropdowns + date-picker sample bug
- E1: apply the new `.select-modern`/`.input-pill` style to the main-page dropdowns (index.html: clientTypeFilter/clientHeartShieldFilter/clientYearFilter/clientSortSelect; sessions.html: sessionClientFilter/sessionTypeFilter + sessionDateFrom/To).
- E2 (bug): F5 date-format picker labels format a real near-today date (settings.js:822 `REFERENCE_DATE="2026-07-02"`) → must show format patterns (dd/mm/yyyy) or a neutral sample, not a real recent date.
- Handoff created for Ben to run via regular GSD: `.claude/context/session-prompts/2026-07-03_phase37-extend-mainpage-dropdowns-datepicker.md`. Verify happens only AFTER this extension.

## Status
- Items 1–4: direction largely decided; implement AFTER the in-flight logic fixer lands (shared files). Quick mockup of the redesigned editor for confirmation.
- Item 5: produce 2–3 interactive mockups → Ben picks → then implement.
- These are Phase-37 UAT UI gaps; phase stays pending until resolved + translations reviewed.
