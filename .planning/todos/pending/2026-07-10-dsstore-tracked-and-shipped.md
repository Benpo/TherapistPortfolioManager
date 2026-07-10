# `.DS_Store` files are tracked and shipped to production

**Found:** 2026-07-10, during Phase 43 planning (computing the gate's watched-file set).
**Severity:** Low (cosmetic/hygiene, no data exposure) — but it ships.

## What

Two `.DS_Store` files are tracked in git and land in production:

- `assets/.DS_Store`
- `assets/illustrations/.DS_Store`

`deploy.yml` does `cp -r assets deploy-staging/`, so both are copied into the deploy
branch and served by Cloudflare Pages.

## Why it matters

macOS Finder metadata. Harmless content, but:
- It is a fingerprint of the maintainer's local filesystem (folder view settings, and on
  some macOS versions, names of files that were *deleted* from the directory).
- It is noise in every `assets/**` glob — it showed up as a "watched file" when sizing
  Phase 43's gate, which is how it was found.
- `.gitignore` presumably already lists `.DS_Store`; these were committed before that, or
  force-added.

## Fix

```
git rm --cached assets/.DS_Store assets/illustrations/.DS_Store
# confirm .gitignore has a .DS_Store line (and **/.DS_Store)
```

Then verify nothing in `deploy.yml`'s copy step depends on them (it doesn't).

## Not Phase 43

Phase 43 is the docs-maintenance gate; it must not widen into repo hygiene. Under that
phase's role table (Ben, 2026-07-10: "watch code only"), non-code files including
`.DS_Store` are not watched by the gate, so this does not block the gate's landing.

Fold into any convenient phase that touches repo tooling, or run as a `/gsd-quick`.
