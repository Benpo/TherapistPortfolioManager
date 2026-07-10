# Project Rules

## Git Sync
**Always run `git pull` at the start of every session** before doing any work, to ensure you have the latest changes from the remote.

```zsh
git pull
```

## Lemon Squeezy
The Sessions Garden store ID is **324581**. The API key in `.env` has access to multiple stores — NEVER query or modify store 289135 (Sapphire Healing), only interact with the Sessions Garden store.

## Definition of Done — docs must not rot

A phase is **not done** until, for its user-facing changes: a **changelog entry** exists
**AND** every affected **help topic** is updated or explicitly declared unaffected. A
push that skips this is blocked by `scripts/docs-gate.js` (run by the local pre-push hook
and, authoritatively, by CI on deploy). This is a contract: the rules below are exactly
what the gate enforces — nothing more, nothing less.

**What counts as "user-facing":** the written, checkable definition lives in the header of
`scripts/lib/role-table.js` (a file is watched only if it is both shipped and code — a
root `*.html`, anything under `assets/`, or `manifest.json`/`sw.js`). To find which help
topic owns a changed file, read `HELP-MAP.md` cold — it is the topic index; never read the
help corpus to answer that.

**The three trailer keys — exact casing (case-sensitive):**

- `Help-Unaffected:` — waive the help demand for the named file(s). Per-file. Honored from
  **any** commit in the pushed range.
- `Changelog-Unaffected:` — waive the changelog demand for the whole push. Global (one
  changelog for the app). Honored from **any** commit in the range.
- `Docs-Emergency-Skip:` — bypass the whole gate. Honored **only on the tip commit of the
  push** (see below).

**One trailer may name MULTIPLE files**, comma-separated, sharing one reason. Write the
paths out — brace-expansion (`i18n-{en,he}.js`) is NOT supported. The reason after the
em-dash is **mandatory** (a fileless or reasonless `Help-Unaffected` is rejected as
malformed). Worked example (a single trailer line):

```
Help-Unaffected: assets/i18n-en.js, assets/i18n-he.js, assets/app.css — tour strings only, no help surface
```

**`Docs-Emergency-Skip:` is honored ONLY on the tip commit of the push.** A skip on any
earlier commit is silently ignored (and reported), so an emergency skip inherited through
a branch merge can never excuse unrelated later work. Put it on the tip or it does nothing.
By contrast, the two `*-Unaffected:` trailers are honored from any commit in the range.

**`git push --no-verify` bypasses only the local hook**, not CI. CI is the enforcement
layer and honors only the trailers above; the emergency skip is loud and auditable in the
CI log. If you need to ship past the gate, use `Docs-Emergency-Skip:` on the tip commit —
never `--no-verify` as a substitute.
