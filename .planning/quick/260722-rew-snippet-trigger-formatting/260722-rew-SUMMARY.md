---
phase: quick-260722-rew
plan: 01
subsystem: snippets
tags: [snippets, trigger-detection, markdown-formatting, regex, tdd]
requires: []
provides:
  - Formatting-aware snippet trigger detection (markers as word boundaries)
affects: [assets/snippets.js]
tech-stack:
  added: []
  patterns:
    - Inline formatting markers (* _ ~ `) treated as word-boundary characters in both detectTrigger boundary classes
key-files:
  created:
    - tests/quick-260722-rew-trigger-formatting.test.js
  modified:
    - assets/snippets.js
decisions:
  - "Markers are boundary characters as a GENERAL rule (locked fix direction) — not a bold-only special case; hyphen deliberately excluded (valid trigger character)"
metrics:
  duration: ~6min
  completed: 2026-07-22
status: complete
---

# Quick 260722-rew: Snippet Trigger Formatting Summary

Snippet autocomplete now fires inside inline markdown formatting markers (bold, italic star/underscore, tilde, backtick) by adding the four marker characters to both of detectTrigger's word-boundary character classes.

## What Was Done

**Task 1 — Failing behavior test (RED)** — commit `2aa6192`
- Created `tests/quick-260722-rew-trigger-formatting.test.js` (vm-sandbox harness modeled on `tests/24-04-trigger-regex.test.js`).
- Scenarios: reported bug (`**;betr` / `**??betr` → partial with candidates, replacement range covers only prefix+query), commit inside bold (`**;betrayal `), other/nested markers (`*` `_` `**_`), closing-marker commit (`;betrayal*` → boundary `*`, end excludes the marker), regressions (mid-word guard, plain triggering, hyphenated `heart-shock` trigger), ReDoS budget (<50ms on ~10k-char adversarial inputs including marker floods).
- **RED proven** against unmodified source: 5 failed (A/B/C/D/E — all formatting-context scenarios), 5 passed (F1–F4 regressions + G budget), exit 1.

**Task 2 — Formatting-aware detectTrigger (GREEN)** — commit `1ca439f`
- `assets/snippets.js`: added `*` `_` `~` `` ` `` to BOTH boundary classes in the detectTrigger regex — leading (word-start) and trailing (commit boundary). Trigger character class, quantifier bounds, and matching logic untouched. Hyphen NOT added (valid trigger character).
- Comments updated truthfully (module-header CONSTRAINTS note, function docstring, inline regex comment block) — behavior only, no planning IDs.

## Verification Results

- `node tests/quick-260722-rew-trigger-formatting.test.js` → **10 passed, 0 failed, exit 0** (GREEN).
- `node tests/run-all.js` → **Suite: 207 passed, 0 failed, 207 total** — trigger-regex, tag-trigger, snippet wiring, textarea autogrow, rich-toolbar/emphasis, undo-stack all green; zero regressions.
- `grep -cE 'Phase [0-9]|26[0-9]{4}' assets/snippets.js` → 0 (comment hygiene clean).
- TDD gates: RED commit `2aa6192` (test), GREEN commit `1ca439f` (fix) — falsifiability demonstrated.

## Docs-Gate Status

- **Help demand (file-scoped): SETTLED.** Commit `1ca439f` carries the trailer
  `Help-Unaffected: assets/snippets.js — bug fix; snippet autocomplete behavior matches the existing help topic, no help surface change`
  (file-scoped trailers are honored from any commit in a pushed range, so this is settled permanently).
- **Changelog demand (push-global): OPEN.** `assets/snippets.js` is a TRIGGER-tier watched file, so any push containing `1ca439f` raises the changelog demand. Deliberately NOT satisfied here — v1.4.0 just shipped and opening a new changelog version section forces a version-bump decision that does not belong in a quick task. At push time, either: (a) the next release's EN changelog edit (`assets/changelog-content-en.js`) rides along and satisfies it, or (b) if this ships alone, Ben places `Changelog-Unaffected:` on the tip commit of the push.
- The new test file under `tests/` is not shipped and raises no demand.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- tests/quick-260722-rew-trigger-formatting.test.js — FOUND
- assets/snippets.js modified — FOUND
- Commit 2aa6192 — FOUND
- Commit 1ca439f — FOUND

## Follow-Up (same session, Ben-approved): formatting markers blocked as prefix

Ben's review question — "doesn't the fix mean `*` can't be a trigger sign?" — surfaced a
real gap: trigger KEYWORDS already exclude formatting chars (`/^[\p{L}\p{N}-]{2,32}$/u`),
but the prefix denylist (`PREFIX_INVALID_CHAR_REGEX`, assets/settings-snippets.js) still
allowed `*` `_` `~` and backtick as the prefix — a configuration that collides with
markdown formatting (partly already broken in v1.4.0: prefix `*` + italic `*word ` would
auto-expand; today's boundary fix widened it to bold spans).

**Resolution (commit `3952b36`, Ben-locked option "block formatting chars as prefix"):**
- `* _ ~ `` ` `` added to `PREFIX_INVALID_CHAR_REGEX`; `validatePrefix` extracted to module
  scope + exposed via `__SnippetEditorHelpers`.
- Helper copy updated in all 4 locales to name the formatting markers.
- Grandfathering: stored marker prefixes keep working (read path does not re-validate);
  only new input is blocked.
- New behavior test `tests/quick-260722-rew-prefix-formatting-chars.test.js` (24/24);
  full suite 208/208.
- Docs-gate: `Help-Unaffected: assets/settings-snippets.js` trailer on `3952b36`
  (help does not enumerate prefix character rules); i18n dictionaries are
  changelog-only tier. Changelog demand unchanged (still OPEN, see above).
