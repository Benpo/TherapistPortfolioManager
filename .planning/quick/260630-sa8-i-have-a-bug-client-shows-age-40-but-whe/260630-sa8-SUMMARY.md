# 260630-sa8 — RESOLUTION: Won't fix (reverted by design)

**Status:** Closed — not a bug. The originally-shipped fix was **reverted** on Ben's call.

## What was reported
A legacy client shows an age (e.g. 40) in the list, but the edit form shows an empty
birth-date picker. The dispatched plan treated the "age gets nulled on save" as a latent
data-loss bug and (a) preserved the stored age on edit-save, (b) added a localized note
explaining the empty picker.

## Why it was reverted
Ben's intent is the **opposite** of the shipped fix:

1. **Age SHOULD clear on edit.** When a practitioner edits such a legacy client, wiping the
   age is desired — it forces them to enter a real birth date so the age becomes accurate
   and self-maintaining, rather than carrying a stale hand-entered number forever.
2. **The explanatory note was unnecessary.** These legacy records exist for ~2 people
   worldwide; a permanent localized UI hint for that edge case is not worth it.

The original behavior (`age = birthDate ? computed : null` in both edit-save paths) is
therefore the **intended** behavior, not a defect.

## Action taken
Reverted the two code commits (`fba8e4e`, `25e0129`) via `git revert`:
- Removed `App.computeClientAgeOnEdit` helper and its wiring in `add-client.js` / `add-session.js`.
- Removed the `client.form.legacyAgeNote` i18n key from all 4 dictionaries and the note rendering.
- Removed the `quick-260630-sa8-legacy-age` test and the `25-06-crop-only` mock stub.

Test suite green after revert: **118 passed, 0 failed**.

**Do not re-dispatch this as a bug.** The wipe-on-edit is by design.
