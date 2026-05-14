# Critical pre-launch bugs — captured during Phase 24-06 UAT (2026-05-14)

Two pre-existing bugs surfaced during Plan 06 UAT. Both block launch. Both
are out-of-scope for Plan 06 but should be triaged into Phase 24 (or a
follow-up phase) before the milestone closes.

## Bug 1 — Edit-Client modal photo flow broken when triggered from new-session screen

**Steps to reproduce:**
1. Open `add-session.html` (any flow that lands on the new-session screen for an
   existing client who already has a photo).
2. Click the pencil button on the spotlight to open the Edit Client modal.
3. Add or change some client data.
4. Trigger the photo upload (re-upload over an existing photo).
5. The image-crop popup opens BEHIND the Edit Client modal — invisible to the user.

**Observed symptoms (chain):**
- (a) Crop popup is hidden behind the Edit Client modal — wrong z-index stacking.
- (b) User must close (Cancel) the Edit Client modal to reveal the crop popup.
- (c) Once the Edit Client modal is closed, clicking "Confirm" on the crop popup
      does NOT update the client — there's no modal context to save into.
- (d) Net result: photo update silently fails from this entry point.

**Likely root causes:**
- Crop modal z-index lower than Edit Client modal (CSS).
- Crop modal commit handler depends on Edit Client modal state that no longer
  exists when the user has to close Edit Client first to interact with the crop.

**Severity:** Critical (data loss — user thinks they saved a new photo but didn't).

**Scope of fix:** investigate `assets/photo-cropper.js` (or equivalent), the
`#editClientModal` flow in `assets/add-session.js`, and the modal-overlay CSS
stacking order. Need a unified modal-stack rule or a single source of truth for
which modal is "on top" when crop is opened from a nested context.

## Bug 2 — No navigation guard on new-session screen

**Steps to reproduce:**
1. Open `add-session.html` to create a new session for an existing client.
2. Fill in fields (e.g., add a topic, write notes).
3. Click the bottom "Back to home" button OR the top logo (which links to the
   homepage).
4. App navigates away immediately — no "you have unsaved changes" warning.

**Expected:** same nav-guard behavior as the EDIT-existing-session flow, where
the user is warned about losing unsaved work.

**Likely root cause:** `App.installNavGuard` consumer registration runs only in
the edit-existing branch of `add-session.js`, or the `formDirty` flag is not
flipped on first input in the new-session branch. Need to verify:
- Whether `window.PortfolioFormDirty` returns true for a dirty new-session form.
- Whether `App.installNavGuard` is wired on logo + back-to-home click targets
  (and whether it covers the new-session entry).

**Severity:** Critical (data loss — therapist loses session notes mid-entry).

**Scope of fix:** likely a one-or-two-line wiring fix once root cause is
located. Same `formDirty` predicate already exists (Phase 22 Plan 12). The
fix may just be ensuring the predicate is checked on the same nav-targets
for both new and existing session flows.

## Suggested handling

Both bugs are pre-launch blockers and natural Phase 24 work (the phase scope
is "pre-launch-final-cleanup"). Options:

- **Option A:** Add as plans 24-07 and 24-08, schedule before Phase 24 closes.
- **Option B:** Bundle into a single 24-07 "modal stacking + nav-guard fixes" plan.
- **Option C:** Defer to a new Phase 25 if Phase 24 is already overlong.

Discuss before deciding.
