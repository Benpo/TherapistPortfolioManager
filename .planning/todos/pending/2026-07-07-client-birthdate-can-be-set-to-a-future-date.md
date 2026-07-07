---
created: 2026-07-07T10:52:03.444Z
title: Client birthdate can be set to a future date
area: bug
files:
  - add-client.html:64
  - add-session.html:143
  - add-session.html:526
  - assets/add-client.js:218
  - assets/add-session.js:480
  - assets/add-session.js:1066
---

## Problem

The birthdate fields for clients (native `<input type="date">` — `#clientBirthDate` in add-client.html, `#inlineClientBirthDate` / `#editClientBirthDate` in add-session.html) have no upper-bound constraint. A user can pick or type a date in the future, which is nonsensical for a date of birth, and the app accepts it without warning (no `max` attribute on the inputs, no validation in the JS read paths at add-client.js:218, add-session.js:480/1066 before persisting `birthDate`).

Found during manual use, not yet triaged for severity/impact on age-derived features (e.g. age math in tests/37-date-format.test.js).

## Solution

TBD — likely either:
- Add `max="<today>"` (set at render/init time) to the three birthdate `<input type="date">` elements, and/or
- Validate on save (reject or warn if `birthDate > today`) in add-client.js and add-session.js before writing the client record.

Should also check whether this needs to interact with the existing `initBirthDatePicker` helper in app.js.
