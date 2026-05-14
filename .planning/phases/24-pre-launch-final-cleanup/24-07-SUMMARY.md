---
phase: 24-pre-launch-final-cleanup
plan: 07
status: complete
completed: 2026-05-14
---

# Plan 24-07 Summary — Photo-crop modal stacking fix

## Outcome

The photo-crop modal now renders above the edit-client modal when triggered
from `add-session.html`. Re-uploading a photo for an existing client no longer
silently loses the new image. UAT confirmed by Ben 2026-05-14.

## Root cause

Both `#cropModal` and `#editClientModal` used the `.modal` class with the same
`z-index: var(--z-modal)`. Stack order fell through to DOM source order:
`#cropModal` at HTML line 387, `#editClientModal` at line 509 — edit-client
appeared later in source so it rendered on top of crop.

User had to close (Cancel) edit-client to see the crop modal. Once edit-client
was closed, confirming the crop ran the onSave callback that updated a closure
variable + preview img on the detached edit-client form — but edit-client's
Save handler was no longer mounted to persist the photo. Result: silent data
loss of the photo update.

## Fix

Single CSS change in `assets/app.css`:

1. Added `--z-modal-top: 350` token between `--z-modal` (300) and `--z-toast` (400).
2. Applied via `#cropModal.modal { z-index: var(--z-modal-top); }` — ID+class
   selector specificity overrides the generic `.modal` z-index rule.

No JS changes, no new i18n keys.

## Side-effect benefit

Edit-client's "close only via X / Cancel button" contract (per the comment at
add-session.js:340 — no Esc, no overlay click) combined with crop sitting on
top means the user CANNOT close edit-client while crop is open. Edit-client's
Cancel and X buttons are visually behind the crop overlay. So the state-coupling
bug (silent photo loss when crop confirms with edit-client closed) is unreachable
as a side-effect of the z-index fix — no JS state changes needed.

## Commits

| Commit | Description |
|--------|-------------|
| `07b4cc9` | feat(24-07): stack photo-crop modal above edit-client modal |

## UAT outcome

Ben confirmed 2026-05-14:
- Crop opens visibly on top of edit-client.
- Confirm crop → preview updates in edit-client → Save persists photo to IDB.
- Cancel crop → edit-client unchanged.
- No console errors.

## Hand-off notes

The `--z-modal-top` token is now reserved for any future stacked-modal cases.
If a third modal layer ever opens from inside crop (unlikely), a `--z-modal-system`
token at ~370 could be added. For now, two layers is sufficient.

The "close only via Cancel/X button" contract on edit-client should be
preserved across future changes — Esc-to-close or overlay-click-to-close on
edit-client would re-introduce the state-coupling bug variant the z-index fix
sidesteps.
