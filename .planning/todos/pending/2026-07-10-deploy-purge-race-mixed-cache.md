---
created: 2026-07-10T21:00:00Z
title: "Fix deploy.yml purge race — CF cache purged before Pages promotion, serves mixed deploys"
area: deploy-pipeline
severity: high
source: v1.3.0 go-live incident (2026-07-10)
---

## Problem

`deploy.yml` purges the Cloudflare cache immediately after pushing the deploy
branch — BEFORE Cloudflare Pages finishes building/promoting the new deployment.
Edges then re-cache OLD files (assets carry `cache-control: max-age=86400`),
and once the new deployment promotes, production serves a MIX of old and new
files for up to 24h.

## Incident (v1.3.0, 2026-07-10, run 29122423243)

- Live `app.js` was new; live `i18n-en.js` was the previous deploy's copy
  (`age: 220`, cached exactly in the race window) → raw i18n keys in the "?"
  menu, broken settings layout.
- Worse: installed PWAs that launched during the window ran the NEW service
  worker (new INTEGRITY_TOKEN cache name) and **precached the stale mix** —
  poisoned caches that no force-quit heals; only the next token roll does.
- Remediated by: `gh run rerun <run-id>` (identical content, purge lands
  post-promotion) → edge consistent; then an empty-commit deploy to roll the
  token so clients re-precache clean.

## Fix directions (pick in planning)

1. Purge AFTER confirming the new Pages deployment is live (poll the Pages
   deployment status API, or poll a content sentinel like the token file until
   it serves the new GITHUB_SHA), THEN purge.
2. And/or purge twice with a delay (belt-and-braces).
3. Consider whether `max-age=86400` on immutable-ish assets is right without
   cache-busting filenames — the SW shields normal operation, but every token
   roll re-fetches through this cache (the poisoning vector).
4. Add a post-deploy consistency check step (curl N key assets, compare bytes
   against the checkout; fail loudly on mismatch) so a mixed deploy can never
   go unnoticed again.
