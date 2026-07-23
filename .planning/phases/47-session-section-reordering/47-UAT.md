---
status: diagnosed
phase: 47-session-section-reordering
source: [preprod field test by Ben, 2026-07-23, Safari desktop, Hebrew UI]
started: 2026-07-23T14:30:00.000Z
updated: 2026-07-23T14:30:00.000Z
---

## Context

Ben pushed the full Phase-47 state (`f4c9aa6`) to pre-prod and field-tested in Safari
(desktop, Hebrew). What's-New popup untested — correctly dormant until the APP_VERSION
bump (release-boundary decision, still open; entry drafted as 1.5.0). Help-center
content structure praised ("the sections the information was incorporated into looks
very good") — gaps below are what failed.

## Tests

### 1. Settings reorder — pointer drag (Safari desktop)
expected: rows drag smoothly via handle; row highlight clears on release
result: FAILED — click registers but rows won't move; 1 success in ~10 attempts on one
row, most rows never move; drag highlight background stays stuck on attempted rows
after release. Arrows not reported broken.

### 2. Settings saved notice — RTL icon
expected: icon renders correctly in RTL
result: FAILED — icon mirrored in Hebrew (circled chevron pointing the wrong way);
screenshot in Ben's report ("ההגדרות נשמרו" toast).

### 3. Severity-off + cleared ratings on existing session — empty section header
expected: after turning severity off in Settings, then clearing both topics' start
ratings in an existing session, the end-of-session severity section disappears
entirely once it has no content
result: FAILED — "דרגת חומרה — סיום המפגש" header remains (with the disabled-in-settings
badge) above a fully empty section.

### 4. Dirty-state guard on rating clears
expected: clearing severity ratings marks the form dirty; navigating away (logo click)
warns "lose your changes?"
result: FAILED — after clearing the two start ratings, logo click navigated home with
NO warning; changes lost. Text edits DO trigger the guard, so only the rating
interactions fail to set the dirty flag.

### 5. What's-New (changelog page) — Hebrew terminology
expected: native, app-consistent Hebrew
result: FAILED — "מקטע" is non-native and reads badly throughout; shipped UI already
says שדות (settings.tab.fields "שמות שדות מותאמים", tour). Help-center HE also "sounds
bad in many terms" beyond this word.

### 6. What's-New (changelog page) — content quality + EN accuracy
expected: entry carries only genuinely-new headline changes, consistent with 1.4.0
result: FAILED — (a) dedicated bullet for Reset order/Reset names is a minor
sub-feature, not What's-New material; entry needs rethinking overall. (b) EN
contradiction: 1.4.0 already says "Choose whether an export includes the
before-and-after emotion ratings", so 1.5.0's "Exports let you include your session
topics with or without the severity ratings" reads like the same feature — must state
precisely what changed in 1.5.0 vs the 1.4.0 behavior.

## Summary

total: 6
passed: 0
issues: 6
pending: 0 (What's-New popup deferred until APP_VERSION bump)
skipped: 0
blocked: 0

## Gaps

- gap: G1 — Safari pointer-drag in Settings reorder barely functional; stuck drag
  highlight after release (WebKit pointer state machine)
  severity: critical
  status: failed
- gap: G2 — settings-saved notice icon mirrored in RTL
  severity: minor
  status: failed
- gap: G3 — empty end-severity section keeps its header after severity-off + in-form
  rating clears (visibility must re-evaluate when form data empties)
  severity: major
  status: failed
- gap: G4 — severity rating clears don't set the form dirty flag → silent data loss on
  navigation
  severity: major
  status: failed
- gap: G5 — HE terminology: מקטע → align with shipped שדות language across i18n-he,
  help-content-he, changelog-content-he; broader HE polish pass on the new help copy
  severity: major
  status: failed
- gap: G6 — What's-New 1.5.0 entry: drop minor-feature bullets (resets), restructure
  around headline changes, and fix the EN 1.4.0-contradiction on export severity by
  stating what actually changed (all four locales follow EN)
  severity: major
  status: failed
