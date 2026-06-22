---
plan: 22-14
title: Quick text & visual fixes (5 round-3 gaps)
created: 2026-05-11
source: UAT round-3 findings (2026-05-07) — see 22-HUMAN-UAT.md
parent_phase: 22
discuss_phase_skipped: true
discuss_phase_skipped_reason: All 5 gaps are small, well-scoped, and decisions captured inline with user 2026-05-11
---

# 22-14 Context

## Scope — 5 round-3 UAT gaps (the "quick text & visual fixes" batch)

This is Batch 1 of the round-3 trickle, optimised to reach the PDF rewrite (phase 23) fastest. All five fixes are localised text or styling changes — no state-machine logic, no data paths, no architecture decisions.

### Gap 1 — Export modal Step 2: pane titles missing

**Symptom:** In the export modal, Step 2 shows two side-by-side panes (a markdown editor on one side, a rendered preview on the other) but neither has a visible heading. First-time users cannot tell which side is which.

**Source files to investigate:**
- `add-session.html` line 432 area — `.export-edit-area`, `#exportEditor`, `#exportPreview`
- `assets/add-session.js` — Step 2 render logic
- `assets/i18n-{en,de,he,cs}.js` — new i18n keys for the pane titles
- `assets/app.css` — title typography (Label role per 22-UI-SPEC)

**UAT truth (must be TRUE after fix):**
> In Step 2 of the export modal, the user can tell at first glance which side is the editor and which side is the preview, in all 4 languages.

### Gap 2 — Pencil/edit icon too small across the app

**Symptom:** The pencil icon used to trigger client edit (the `.edit-client-btn` on the client spotlight) is 34×34px with a small SVG glyph. Hard to read visually, below the 44×44px touch target standard.

**Source files to investigate:**
- `assets/app.css` line 760 area — `.edit-client-btn` rule (currently 34×34px)
- HTML files where pencil/edit icons appear — `add-session.html`, `add-client.html`, the client spotlight component
- Any session-edit triggers (sessions.js line 132 — `editButton.className = "session-edit"`)
- Whichever pages reuse the same icon

**UAT truth (must be TRUE after fix):**
> Pencil/edit icons across the app are large enough to read at a glance and meet the 44×44px touch-target standard on mobile.

### Gap 3 — Date-of-birth picker year-first feels reversed

**Symptom:** The 3-dropdown birth date picker (added in phase 20-01) renders Year → Month → Day in DOM order. For Sapir's primary locales (German, Hebrew, Czech, English-EU) the natural reading order is Day → Month → Year (DD.MM.YYYY). Year-first feels reversed.

**Source files to investigate:**
- `assets/app.js` line 824 area — `initBirthDatePicker()` (the three `appendChild` calls at lines 902–904 set DOM order)
- All 3 instances: `add-client.html` (line 62), inline add-session form (line 127), edit-client modal in `add-session.html` (line 501)

**UAT truth (must be TRUE after fix):**
> The birth date picker reads Day → Month → Year in DOM order across all 3 instances, in all 4 languages, with RTL Hebrew presenting Day on the right (start of reading).

### Gap 4 — Hebrew "בחירה..." placeholder dots render on wrong end (bidi)

**Symptom:** The Hebrew select-placeholder "...בחירה" (currently i18n-he.js line 84) renders with the ellipsis dots on the wrong visual end. Sapir flagged this on 2026-05-07.

**Source files to investigate:**
- `assets/i18n-he.js` — line 84 `client.form.referral.placeholder`, plus any other `*.placeholder` keys with `...` patterns
- The placeholder source string `"...בחירה"` (Unicode logical order: dots-then-Hebrew)

**UAT truth (must be TRUE after fix):**
> Hebrew placeholders with an ellipsis render with the dots at the trailing end of the visible text, as a Hebrew reader expects.

**Implementation hint:** Investigate whether switching the ASCII `...` to the single Unicode horizontal-ellipsis character `…` (U+2026) fixes the bidi resolution, or whether the dots need to move to the other end of the source string. Planner picks based on actual browser rendering — both Chrome/Safari and the Hebrew RTL flow.

### Gap 5 — Hebrew copy uses female-only form ("בחרי") — must be neutral

**Symptom:** Two helper strings in i18n-he.js (lines 298 and 300) use the female imperative "בחרי" ("choose" — feminine). The app's register convention is gender-neutral.

**Source files to investigate:**
- `assets/i18n-he.js` lines 298 (`export.step1.helper`) and 300 (`export.step3.helper`)
- Any other strings with female-imperative forms (search for `בחרי`, `הזיני`, `שמרי`, `בחרת`, `הזנת`)

**UAT truth (must be TRUE after fix):**
> All Hebrew strings in the app use gender-neutral phrasing, consistent with today's אפס→איפוס fix.

---

## Decisions (resolved with user, 2026-05-11)

### Decision 1 — Export pane titles (Gap 1)
**Choice:** Small visible labels above each pane: **"Edit"** (left/start of row in LTR; right/start in RTL) for the markdown source editor, **"Preview"** for the rendered output. Same typography as a CSS Label role (weight 600, line-height 1.4, size body-sm) per 22-UI-SPEC. Translated in all 4 locales.
**Rationale:** Plain language, no jargon ("Markdown" would be technical for therapists). Mirrors how the stepper already labels "Step 2: Edit".
**i18n keys (new):** `export.step2.label.edit`, `export.step2.label.preview`

### Decision 2 — Edit icon sizing (Gap 2)
**Choice:** Bump `.edit-client-btn` container to **44×44px** (touch standard). Scale the inner SVG glyph proportionally — current is small, aim for ~20–22px visible glyph. Apply the same sizing to any other pencil icon variants across the app (one consistent rule, not ad-hoc per-page).
**Rationale:** 44×44 is the WCAG / iOS / Material touch-target minimum. Visible glyph 20–22px gives an accessible-icon ratio (~50% of container) per the 22-UI-SPEC icon role.
**Risk note:** Phase 21 (mobile responsiveness) is also planned but not yet started — this change should not conflict with Phase 21. If Phase 21 later imposes a different mobile-specific override, it can layer on top.

### Decision 3 — Birth date picker order (Gap 3)
**Choice:** Swap DOM order from **Year → Month → Day** to **Day → Month → Year** in `initBirthDatePicker()`. All other logic (year-range, locale month names, day-count update) stays identical — only the three `appendChild` lines reorder.
**Rationale:** DD.MM.YYYY is the European convention (DE primary, CS secondary, HE reads naturally right-to-left so Day appears on the visual right which is the start of reading). EN users in this app are mostly EU therapists too.
**Risk note:** The picker's read/write logic accesses elements by class (`.birth-date-year`, `.birth-date-month`, `.birth-date-day`), not DOM order — so swapping `appendChild` order will not break the hidden-value sync. Worth verifying once with a manual test in each of the 3 form instances (add-client, inline add-session, edit-client modal).

### Decision 4 — Hebrew ellipsis bidi (Gap 4)
**Choice:** Planner to investigate both fixes and pick by browser rendering test:
  (a) Replace ASCII `...` with the single Unicode horizontal ellipsis character `…` (U+2026), keeping source order Hebrew-then-ellipsis OR ellipsis-then-Hebrew based on what produces correct visual flow.
  (b) Or reorder the source string.
Acceptance: in Chrome (desktop + iOS Safari), the dots render at the trailing end of the Hebrew text as a native reader expects.
**Rationale:** Bidi resolution depends on Unicode category — a single ellipsis char behaves more predictably than three weak ASCII dots.
**Scope:** Any other Hebrew placeholder strings with `...` patterns get the same treatment in one pass.

### Decision 5 — Hebrew gender-neutral copy (Gap 5)
**Choice:** Rewrite the two helper strings to remove the female imperative "בחרי". Two viable approaches:
  (a) **Infinitive rewrite** — "...יש לבחור אילו חלקים" or "ניתן לבחור..." (most neutral, slightly more formal).
  (b) **Masculine imperative as neutral default** — "בחר אילו חלקים..." (the Hebrew tech-UI convention; masculine imperative is the default-neutral in software).
**Recommendation:** Approach (a) — infinitive — to stay consistent with today's אפס→איפוס precedent (noun/infinitive forms preferred for neutrality in this app).
**Scope:** Also sweep i18n-he.js for any other female-only verb forms (search patterns: `בחרי`, `הזיני`, `שמרי`, `מחקי`, `הקלידי`, `העתיקי`, `שלחי`).

---

## Non-goals (explicitly NOT in 22-14)

- Backup-encryption UX (skip-encryption confirm + password feedback) — those are **batch 2 → plan 22-15**.
- PDF export bugs (edge trim, Hebrew bidi loss) — those are **phase 23 — the destination**.
- Backup "send to myself" attachment + 3-buttons architecture — **plan 22-16** after PDF.
- Mobile/iPhone 375px audit — **phase 21**, parked at user request.
- PWA update path / demo mode testing — parked at user request.
- The emotions-quick-paste feature — separate todo, not a bug.

---

## References

- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-HUMAN-UAT.md` — round-3 gaps (search for N1, N2, N3, N6, N9)
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-13-CONTEXT.md` — pattern this CONTEXT mirrors
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md` — Label role typography tokens
- `.planning/phases/20-pre-launch-ui-polish/20-01-PLAN.md` — original birth-date-picker introduction (phase 20-01)

---

## Risk

**Low across the board.**

- **Gap 1 (export pane titles):** pure additive markup + i18n keys.
- **Gap 2 (edit icon sizing):** single CSS rule change; ripples to wherever the class is used (1 page directly, possibly 1–2 others).
- **Gap 3 (DOB order):** three lines of DOM ordering change, no logic change.
- **Gap 4 (Hebrew ellipsis):** one (maybe two) string edit; needs visual verification in Chrome.
- **Gap 5 (Hebrew female-form sweep):** translation-only; needs Sapir's eye on the final wording before flipping the UAT row to closed-fixed.

The **i18n-files serialisation constraint** from earlier rounds applies: if 22-14 is parallelised with another i18n-touching plan, sequence the edits. For 22-14 alone, not a concern.

Manual UAT confirmation required from Ben (and Sapir for the Hebrew strings) on all 5 gaps before flipping them to `closed-fixed` in 22-HUMAN-UAT.md.
