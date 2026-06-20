---
quick_id: 260620-p3f
slug: snippet-editor-pending-tag-text-not-comm
date: 2026-06-20
status: complete
commit: 0e495a0
---

# Quick Task 260620-p3f — Summary

## What was wrong

In the Text Snippets editor, **adding a tag did nothing** if the user typed the
tag and clicked **Save** without first pressing Enter / "," / Tab. The save
reported success (the "saved" toast fired), but the tag was neither persisted
nor displayed — matching the report: *"adding ones isn't adding them despite the
saving function says all good, and they are not being shown."*

## Root cause

`handleSave()` read tags via `readEditorTags()`, which only collects
already-committed `<li>` chips from `#snippetEditorTagsList`. A tag is only
turned into a chip by the input's keydown handler (Enter / "," / Tab). The text
still sitting in `#snippetEditorTagsTextInput` was never flushed, so a
typed-but-uncommitted tag was silently dropped on Save.

The committed-chip path (press Enter, then Save) always worked — which is why the
bug looked intermittent / "strange."

## Investigation method

Reproduced empirically with a jsdom + fake-indexeddb harness driving the **real**
`settings.html` + `assets/settings.js` + `assets/db.js` (no app code stubbed
except `App`/`Snippets`):

| Flow | Before fix | After fix |
|------|-----------|-----------|
| type "anxiety" → **Enter** → Save | `tags:["anxiety"]`, shown ✅ | `tags:["anxiety"]` ✅ |
| type "depression" → **Save** (no Enter) | `tags:[]`, toast still fired ❌ | `tags:["depression"]` ✅ |

## Fix (`assets/settings.js`)

1. `pendingTagToCommit(committedTags, pendingRaw)` — pure helper: trims +
   lowercases the pending input, returns the tag to append or `null` when blank
   or a duplicate. Single source of truth for tag normalization.
2. `commitPendingTag()` — flushes the pending input into a committed chip, then
   clears the input.
3. `handleSave()` calls `commitPendingTag()` immediately before
   `readEditorTags()`.
4. `addCurrent()` (Enter/comma/Tab commit) refactored to reuse
   `pendingTagToCommit` so Enter and Save normalize identically.
5. Exposed `pendingTagToCommit` + `commitPendingTag` via
   `window.__SnippetEditorHelpers`.

The pre-commit hook auto-bumped the service-worker cache `sessions-garden-v207 →
v208` (settings.js is a precached asset).

## Test

`tests/quick-260620-p3f-pending-tag-commit.test.js` (zero-dependency vm sandbox,
matching project convention — jsdom is intentionally not a repo dependency):
- Pure `pendingTagToCommit`: new tag, trim+lowercase, blank/whitespace/null →
  null, case-insensitive dedupe.
- DOM-flush `commitPendingTag` against a capable fake DOM: a typed tag becomes
  exactly one `data-tag` chip + input cleared; repeated flush of the same value
  adds no duplicate; a second distinct tag appends normalized.

Falsifiable: both helpers were `undefined` before the change (verified RED).
After the fix: **16/16 pass**.

## Verification

- New regression test: 16/16 pass.
- End-to-end jsdom harness: Scenario B now persists the tag (was `[]`).
- Full suite: 64/64 non-PDF test files pass. The 7 failing PDF tests are
  **pre-existing and environmental** (they require jsdom at
  `/tmp/node_modules/jsdom`, which is not installed); they fail identically
  without this change and none reference `settings.js`/snippets.

## Commit

- `0e495a0` — fix(snippets): commit pending tag text on Save so typed tags
  aren't lost (assets/settings.js, sw.js cache bump, regression test)
