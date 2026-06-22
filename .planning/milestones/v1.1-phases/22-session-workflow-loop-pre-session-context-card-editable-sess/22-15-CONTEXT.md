---
plan: 22-15
title: Backup encryption UX pair (skip-confirm + password feedback)
created: 2026-05-11
source: UAT round-3 findings (2026-05-07) — N11 + N12 in 22-HUMAN-UAT.md
parent_phase: 22
discuss_phase_skipped: true
discuss_phase_skipped_reason: Both gaps are well-scoped backup-encryption UX, decisions captured inline with user 2026-05-11
---

# 22-15 Context

## Scope — 2 round-3 UAT gaps (the "backup encryption UX" batch)

Batch 2 of the round-3 trickle. Both gaps live inside the same dialog flow (`_showPassphraseModal()` in `assets/backup.js`), so they're naturally paired.

After 22-15 ships, the next batch is **Phase 23 — PDF rewrite** (the destination).

### Gap N11 — Skip-encryption needs explicit confirmation (major, privacy)

**Symptom:** From the export-encryption prompt, clicking "Skip Encryption" produces an unencrypted `.zip` backup of all therapist client data with a single click. No confirmation, no warning naming the privacy implication. Pairs with the data-loss work from 22-12 (which made Cancel = no file) — same dialog, different missing guardrail.

**Source files to investigate:**
- `assets/backup.js` lines 196–280 — `_showPassphraseModal()` ; cancelBtn click handler calls `opts.onSkip()` immediately (line 271)
- `assets/i18n-{en,de,he,cs}.js` — new keys for the confirmation dialog copy
- `assets/app.css` — any new styling needed for the confirmation pane

**UAT truth (must be TRUE after fix):**
> Backup export without encryption (Skip Encryption path) requires explicit user confirmation — not allowed silently.

### Gap N12 — Password dialog dead-end (major, UX)

**Symptom:** Three layered issues in the encryption password dialog:
1. **Silent mismatch:** Two different passwords → confirm button greys out, no error message explaining why. User has no idea what's wrong.
2. **Hidden complexity rules:** Even when both passwords match (e.g., `111111111` / `111111111`), the button stays disabled because the input fails `isWeakPassphrase()` (pure digits). Rules are enforced but never shown. User is stuck.
3. **No actionable feedback:** The current `errorEl` does flash a weakness message when the user types a weak password, but it does NOT show a mismatch message, and it doesn't pre-emptively list the rules.

**Source files to investigate:**
- `assets/backup.js` line 229 area — `validate()` function; mismatch branch only does `confirmBtn.disabled = ...` with no error text
- `assets/backup.js` line 220 area — `isWeakPassphrase()` defines the rules: ≥6 chars, not all same, not pure digits
- `assets/backup.js` line 183 area — `errorEl` element is created but only populated on weakness/mismatch-on-confirm-click
- `assets/i18n-{en,de,he,cs}.js` — new keys for rules text and mismatch error
- `assets/app.css` — new styling for the rules hint block

**UAT truth (must be TRUE after fix):**
> Backup encryption password fields give the user actionable feedback when validation fails — visible mismatch error, complexity rules shown up-front, no silent dead-end.

---

## Decisions (resolved with user, 2026-05-11)

### Decision 1 — Skip-encryption confirmation flow (Gap N11)
**Choice:** **In-modal two-step confirmation** (not a stacked modal). When the user clicks "Skip Encryption", swap the modal body to a confirmation pane with:
- Clear warning heading: "Export without encryption?"
- Body text naming the privacy implication: "The backup file will contain all your client data unprotected. Anyone with access to the file can read it."
- Two buttons:
  - **"Go back"** (secondary) — returns the modal to the password-entry pane (no destruction of typed passwords)
  - **"Yes, export unprotected"** (primary destructive style — red/orange) — proceeds with `opts.onSkip()`
- Escape key on the confirm pane returns to password-entry (NOT abort) — Escape behaviour is "go back one step" inside the modal.
- X close button on the confirm pane still aborts entirely (calls `opts.onCancel()`) — consistency with the modal's existing close semantics.

**Rationale:** A stacked second modal is heavier than this UI deserves and would compound focus-trap complexity. Swapping the modal body is the minimal change and reads as a single coherent decision flow.

**i18n keys (new):**
- `backup.passphrase.skipConfirm.heading` = "Export without encryption?"
- `backup.passphrase.skipConfirm.body` = "The backup file will contain all your client data unprotected. Anyone with access to the file can read it."
- `backup.passphrase.skipConfirm.goBack` = "Go back"
- `backup.passphrase.skipConfirm.proceed` = "Yes, export unprotected"

### Decision 2 — Password mismatch error (Gap N12, part 1)
**Choice:** In the existing `validate()` function, when both inputs have content AND they differ, set `errorEl.textContent = _t('backup.passphrase.mismatchHint')` and `errorEl.hidden = false`. Keep the existing weakness-error behaviour intact (weakness takes precedence over mismatch — if v1 is weak, show weakness first; once v1 is strong-enough, then show mismatch if v1 !== v2).

**Rationale:** Single source of truth for the error element. The existing post-confirm-click mismatch message at line 251 stays as a defensive fallback.

**i18n keys (new):**
- `backup.passphrase.mismatchHint` = "Passwords don't match yet."

### Decision 3 — Complexity rules shown up-front (Gap N12, part 2)
**Choice:** Add a small static "rules" hint block between the warning text and the first password input. Plain language, no jargon, mirrors what `isWeakPassphrase()` actually enforces:
- "Minimum 6 characters"
- "Cannot be the same character repeated"
- "Cannot be only numbers"

**Implementation:** A `<div class="passphrase-rules">` with three lines (UL or BR-separated — planner picks). Visible at all times in encrypt mode; hidden in decrypt mode (rules don't apply when entering an existing password).

**i18n keys (new):**
- `backup.passphrase.rules.heading` = "Password must:"
- `backup.passphrase.rules.minLength` = "Be at least 6 characters"
- `backup.passphrase.rules.notRepeated` = "Not be the same character repeated"
- `backup.passphrase.rules.notOnlyDigits` = "Not be only numbers"

### Decision 4 — Live strength indicator (Gap N12, part 3 — DEFERRED)
**Choice:** **Not in 22-15.** Decisions 2 and 3 together solve the dead-end UX. A strength indicator would be a separate visual layer; defer to a follow-up if Ben wants it after seeing the result.
**Rationale:** Keeps scope tight, ships sooner, reduces test surface.

---

## Non-goals (explicitly NOT in 22-15)

- The strength indicator (D4 above) — deferred.
- Reworking the password modal's *visual* design (button positions, colours other than the new destructive button) — only the additions specified.
- Touching the decrypt-side flow (import .sgbackup) — the rules hint is encrypt-only, and the mismatch error doesn't apply (only one input on decrypt).
- The PDF blocker — that's Phase 23, next batch.
- Backup "send to myself" email + 3-buttons architecture — that's the last trickle plan (22-16), after PDF.
- Mobile/iPhone audit, PWA update path, demo mode — parked at user request.

---

## References

- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-HUMAN-UAT.md` — round-3 gaps N11 (line 415) and N12 (line 430)
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-12-data-safety-guards-SUMMARY.md` — sibling plan that introduced the three-state cancel/skip sentinel
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-14-CONTEXT.md` — previous trickle batch pattern (mirror frontmatter structure)
- `assets/backup.js` lines 119–284 — `_showPassphraseModal()` (the single function 22-15 modifies)
- `assets/backup.js` line 220 — `isWeakPassphrase()` (the rules the new hint block must mirror exactly)

---

## Risk

**Low–medium.**

- **N11 confirmation flow:** New conditional code path in `_showPassphraseModal()`. Must preserve the existing three-state resolve sentinel (`true | false | 'cancel'`) introduced by 22-12. The "Yes, export unprotected" button still calls `opts.onSkip()` → resolves `false`. The "Go back" button returns to password entry — no resolve. The X button still calls `opts.onCancel()` → resolves `'cancel'`. **No change to the public contract.**
- **N12 mismatch + rules:** Pure additive — new DOM elements, new error text path. The existing `validate()` decision tree gains one more branch.
- **i18n:** 8 new keys across 4 locales = 32 string additions. Hebrew + German encoding conventions from earlier rounds apply. Hebrew must be gender-neutral by default (per today's precedent — noun/infinitive forms).
- **Focus trap:** The two-pane modal must keep focus inside on the active pane. Tab order: skip-confirm primary button → secondary "Go back" → X close.
- **No service-worker / cache changes expected** beyond the standard pre-commit cache bump.

Manual UAT confirmation required from Ben on both gaps before flipping N11 and N12 to `closed-fixed` in `22-HUMAN-UAT.md`. Sapir for Hebrew naturalness on the new 8 keys.
