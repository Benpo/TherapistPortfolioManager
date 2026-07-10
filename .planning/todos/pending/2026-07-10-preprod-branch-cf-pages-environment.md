---
created: 2026-07-10T06:46:47.000Z
title: Pre-prod branch wired to a second Cloudflare Pages project (CI/CD)
area: infra
priority: medium
files:
  - sw.js
  - _redirects
---

## Problem

There is no environment that reproduces production's URL semantics before a real
deploy, so Service Worker / offline behaviour can only be tested by shipping.

`python3 -m http.server` — the usual local server — is actively misleading for
any SW/offline test, in two silent ways:

1. `sw.js` precaches **extensionless** routes (`/changelog`, `/sessions`,
   `/reporting`, …) because that is what Cloudflare Pages serves. python 404s all
   of them. The install handler uses `Promise.allSettled` (`sw.js:209`), so the
   worker installs *successfully* with a half-empty cache and nothing turns red.
   Offline, `/changelog` then returns **HTTP 200 serving index.html** — a false pass.
   Measured during Phase 42 UAT: 73 cached entries under python vs 94 under
   Cloudflare semantics.
2. macOS's case-insensitive filesystem resolves `/license` to the `LICENSE`
   copyright file rather than `license.html`, and the SW precaches that raw text
   *as the license page*.

Neither failure occurs on Cloudflare Pages.

## Solution

Create a long-lived `pre-prod` branch connected to a **second** Cloudflare Pages
project (separate from the production `sessionsgarden.app` project). That gives a
real CF origin — real clean URLs, real `_redirects`/`_headers`, real deploy-stamped
`INTEGRITY_TOKEN` — to install as a PWA and test offline/update-delivery on a real
device before promoting to `main`.

This would also finally cover the two things a local harness structurally cannot:
- installed-PWA cold launch on a real device / iOS Safari
- the deploy-stamped `INTEGRITY_TOKEN` cache-roll (locally `CACHE_NAME` is always
  `sessions-garden-dev`) — the exact mechanism behind the Phase 28 update-delivery bug

## Interim

A Cloudflare-faithful local server was written during Phase 42 UAT (serves `/foo`
from `foo.html`, 301-redirects `/foo.html` → `/foo`, rejects case-insensitive
filename matches). It was **not** checked into the repo — Ben prefers the pre-prod
branch as the real fix. Recreate it if a local offline test is needed before then.

## Origin

Ben, during Phase 42 UAT (2026-07-10), after the python-server failure modes above
were demonstrated: "I would just create a second branch with pre-prod version of the
app which we can connect to another CF page, but not now — as future plan to improve
CI CD."
