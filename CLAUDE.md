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

**The changelog-only tier.** A subset of watched files — the recurring plumbing (`app.js`,
the `i18n-*` dictionaries, the shared chrome/tokens/version), the docs-system machinery
itself (the help and changelog pages plus their scripts/styles, `whats-new.js`,
`attention-coordinator.js`), and the teaching-layer machinery (the guided `tour.*`) —
raises the **changelog demand only** and is **exempt from the per-file help demand**, so it
never needs a `Help-Unaffected:` trailer. None can earn a help topic of its own: any
user-visible change they carry is documented under the feature's own topic and in the
changelog. Separately, **PoC surfaces** (currently the `reporting.*` proof-of-concept) are
**denylisted** — carved out entirely until productized, demanding nothing; deleting their
DENYLIST lines re-arms the gate. The exact membership of both sets lives in
`scripts/lib/role-table.js` — that header is the source of truth; this rule points at it
rather than restating the lists.

**What "updated" means — satisfaction is trusted, not verified.** The changelog demand is
satisfied by an edit to `assets/changelog-content-en.js`; a help demand by an edit to
`assets/help-content-en.js`. **EN only** — EN is the corpus of record (the release check and
the `covers[]` index read EN and nothing else, and translations follow EN in later locale
passes), so a locale-only edit (`*-he.js`/`*-de.js`/`*-cs.js`) does **not** satisfy a demand.
WHICH topic or changelog entry you edited is **trusted, not verified**: the gate confirms an
EN help/changelog edit accompanies the push, but per-topic content diffing is deliberately
out of scope.

**The three trailer keys — exact casing (case-sensitive):**

- `Help-Unaffected:` — waive the help demand for the named file(s). Per-file. Honored from
  **any** commit in the pushed range.
- `Changelog-Unaffected:` — waive the changelog demand for the whole push. Global (one
  changelog for the app), so — like the emergency skip — honored **only on the tip commit
  of the push**; a non-tip one found in the range is ignored and reported.
- `Docs-Emergency-Skip:` — bypass the whole gate (including the structural invariants).
  Honored **only on the tip commit of the push** (see below).

**One trailer may name MULTIPLE files**, comma-separated, sharing one reason. Write the
paths out — brace-expansion (`i18n-{en,he}.js`) is NOT supported. The reason after the
em-dash is **mandatory** (a fileless or reasonless `Help-Unaffected` is rejected as
malformed). Worked example (a single trailer line):

```
Help-Unaffected: assets/reporting.js, assets/tour.js — internal refactor only, no help surface
```

**`Docs-Emergency-Skip:` is honored ONLY on the tip commit of the push.** A skip on any
earlier commit is silently ignored (and reported), so an emergency skip inherited through
a branch merge can never excuse unrelated later work. Put it on the tip or it does nothing.
A valid tip skip bypasses the WHOLE gate — the structural invariants (Phase 1) included, not
just the range rule. The three keys differ on WHERE they are honored: `Help-Unaffected:` is
file-scoped and honored from **any** commit in the range; `Changelog-Unaffected:` (push-global)
and `Docs-Emergency-Skip:` (whole-gate) are honored **only on the tip commit**, and a non-tip
one is ignored and reported.

**`git push --no-verify` bypasses only the local hook**, not CI. CI is the enforcement
layer and honors only the trailers above; the emergency skip is loud and auditable in the
CI log. If you need to ship past the gate, use `Docs-Emergency-Skip:` on the tip commit —
never `--no-verify` as a substitute.

**Recovery when the CI anchor cannot resolve (no trailer can help here).** CI anchors its
range to the last-deployed commit read from the remote `deploy` branch's `Deploy from
<sha>` subject (resolved by `scripts/ci-resolve-docs-range.sh`). If main's history was
rewritten — or that subject was mangled — the anchor may no longer resolve, and the
resolver **fails closed** (exit 1) and prints a recovery runbook. A `Docs-Emergency-Skip:`
trailer **cannot** rescue this: the resolver runs *before* `scripts/docs-gate.js`, so no
trailer is read at that point. Recover non-destructively, either: (1) delete the remote
`deploy` branch — `git push origin --delete deploy` — so the next deploy sees `ls-remote`
exit 2 and takes the first-run bootstrap path (tip commit only) before re-anchoring, or
(2) re-point `deploy` to a commit reachable from main's current tip so its subject resolves
again. Neither touches main or any source; both only reset the deploy anchor. (Note: an
`ls-remote` network/auth fault — any exit code other than 0 or 2 — also fails closed by
design, so a transient blip never silently un-gates a multi-commit push.)
