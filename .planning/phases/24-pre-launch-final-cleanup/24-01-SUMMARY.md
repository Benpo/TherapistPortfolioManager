---
phase: 24-pre-launch-final-cleanup
plan: 01
status: complete
completed: 2026-05-14
---

# Plan 24-01 Summary — Dropdown spotlight SSOT (BLOCKER)

## Outcome

Extracted `populateSpotlight(clientId)` as a single-source-of-truth function in `assets/add-session.js`. Both entry paths (deep-link `?clientId=` and dropdown change) now render identical spotlight UI: photo, name, age, notes.

## Changes

| File | Change |
|------|--------|
| `assets/add-session.js` | Renamed `updateClientSpotlight()` → `populateSpotlight(clientId)`. Signature now takes explicit `clientId` argument instead of reading `clientSelect.value` from DOM. Body uses `parsedId` (from `Number.parseInt(clientId, 10)`). Edit-button visibility logic simplified — when `parsedId` is truthy AND `selectedClient` resolved, show edit button (no longer needs to read `clientSelect.value !== "__new__"` since `parseInt("__new__")` is NaN → early-return branch already hides everything). |
| `assets/add-session.js` | Added one-line SSOT comment above the function: `// populateSpotlight: SSOT for client spotlight (Phase 24 D-01). Plan 06 extends with Session-info subsection.` |
| `add-session.html` | Added hand-off comment inside `<div id="clientSpotlight">`: `<!-- populateSpotlight render target — Plan 06 (Phase 24) appends Session-info subsection here -->` |

## Call sites migrated (line numbers AFTER changes)

| Old line | Context | Argument passed |
|----------|---------|-----------------|
| 354 | After edit-client modal save → reload + repopulate | `savedClientId` |
| 369 | Initial mount after `loadClients(prefillClientId)` | `prefillClientId \|\| clientSelect.value` (handles both deep-link and bare-page entry) |
| 379 | `clientSelect` change handler | `clientSelect.value` |
| 1463 | After inline new-client creation | `id` (newly created client id) |
| 1473 | Inline-new-client Cancel handler | `null` (intent: hide spotlight) |
| 1590 | `app:language` listener | `editingSession.clientId` if editing, else `clientSelect.value` |
| 1597 | After `populateSession` in edit mode | `editingSession.clientId` |
| 1839 | End of `populateSession()` body | `session.clientId` |

**Total:** 8 call sites migrated. Plan estimated 7 — the additional site (line 354, after edit-client modal save) was found during grep audit and migrated with explicit `savedClientId`.

## Hand-off for Plan 06

- Extension point in HTML: `<!-- populateSpotlight render target — Plan 06 (Phase 24) appends Session-info subsection here -->` immediately inside `<div id="clientSpotlight">`. Plan 06 will append a Session-info subsection sibling to `client-spotlight-media` and `client-spotlight-text`.
- Extension point in JS: `populateSpotlight(clientId)` function is module-scope; Plan 06 can either (a) extend the function body to append Session-info DOM, or (b) wrap it with a second call that adds Session-info after the spotlight render completes. Recommend option (a) — keeps SSOT.
- Available identifiers inside `populateSpotlight`: `parsedId` (numeric), `selectedClient` (full client object from `clientCache`).

## Acceptance gates

| Gate | Result |
|------|--------|
| `grep -c "function populateSpotlight" assets/add-session.js` | 1 ✓ |
| `grep -c "function updateClientSpotlight" assets/add-session.js` | 0 ✓ |
| `grep -c "updateClientSpotlight(" assets/add-session.js` | 0 ✓ |
| HTML contains `populateSpotlight render target` comment | yes ✓ |
| JS contains `populateSpotlight: SSOT for client spotlight (Phase 24 D-01)` comment | yes ✓ |
| Manual UAT both entry paths | DEFERRED — requires Ben to test in browser |

## UAT items (for Ben to verify before Plan 02 ships)

- [ ] Load `add-session.html?clientId=<existing-id>` for a client with photo + notes → spotlight shows photo + name + age + notes.
- [ ] Load `add-session.html` (no query param), pick the same client from the dropdown → spotlight shows IDENTICAL photo + name + age + notes.
- [ ] Pick a different client → spotlight re-renders within ≤200ms.
- [ ] Pick `__new__` placeholder → spotlight hides; inline-new-client form appears.
- [ ] Edit-client modal save → spotlight refreshes with updated data.
- [ ] Edit-session entry (existing session) → spotlight renders client info.
