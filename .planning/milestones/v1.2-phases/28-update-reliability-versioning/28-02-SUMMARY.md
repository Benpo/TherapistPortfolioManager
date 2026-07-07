---
phase: 28-update-reliability-versioning
plan: 02
subsystem: delivery-headers
tags: [csp, security-headers, cache-control, cloudflare-pages]
requires:
  - "_headers global /* block (existing security headers)"
  - "per-page <meta> CSP in index.html:23 (source of truth for byte-equivalence)"
provides:
  - "HTTP Content-Security-Policy header in _headers (global /* block)"
  - "raised static JS/CSS cache TTL (max-age=86400)"
  - "verified-equivalent CSP header that Plan 03 depends on before deleting the 21 <meta> CSP tags"
affects:
  - "Plan 03 (Wave 2) — gated on this header being verified equivalent before <meta> CSP deletion"
tech-stack:
  added: []
  patterns:
    - "Cloudflare Pages _headers global /* block for HTTP security headers"
    - "per-path _headers blocks for cache-control (/*.js, /*.css, /*.html, /sw.js)"
key-files:
  created: []
  modified:
    - "_headers"
decisions:
  - "CSP delivered via HTTP header byte-equivalent to the meta; unsafe-inline kept verbatim (removal out of scope for v1.2, D-Discretion)"
  - "No /landing.html per-path block needed — default-src 'self' + X-Frame-Options: SAMEORIGIN already govern the same-origin ./demo.html iframe"
  - "HTML + sw.js stay no-cache so the service worker still owns freshness for installed users (VER-05)"
metrics:
  duration: 4min
  completed: 2026-06-22
status: complete
---

# Phase 28 Plan 02: update-reliability-versioning Summary

Migrated CSP from 21 per-page `<meta>` tags to a single HTTP `Content-Security-Policy` header in `_headers` (byte-equivalent, `unsafe-inline` kept) and raised the static JS/CSS cache TTL to 86400s while keeping HTML and sw.js no-cache so the service worker still owns freshness.

## What Was Built

### Task 1 — HTTP CSP header (VER-04)
Added a `Content-Security-Policy:` line to the global `/*` block in `_headers`. The exact header string written is:

```
Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.lemonsqueezy.com; font-src 'self'
```

- **Byte-equivalence confirmed:** the header value (whitespace-normalized) is identical to the `<meta http-equiv="Content-Security-Policy">` content at `index.html:23`, verified by the plan's automated diff. A repo-wide grep confirmed the CSP content is a single unique string across all 21 HTML pages — no per-page drift.
- **`unsafe-inline` kept verbatim** in both `script-src` and `style-src` (removal is out of scope for v1.2).
- **connect-src unchanged:** `'self' https://api.lemonsqueezy.com` — no new network surface added (VER-06).
- **X-Frame-Options: SAMEORIGIN** and the other existing headers left untouched.

### Task 2 — Cache TTL (VER-05)
Changed `Cache-Control` for `/*.js` and `/*.css` from `public, max-age=3600` to `public, max-age=86400`. Left `/*.html` and `/sw.js` at `no-cache`. No `max-age=3600` remains in the file.

## Landing demo-iframe reasoning (X-Frame-Options reconciliation)

`landing.html` embeds `<iframe id="demo-iframe" src="./demo.html" ...>` — a **same-origin** frame. The CSP has no `frame-src`/`frame-ancestors` directive, so `default-src 'self'` governs the framed resource, and `./demo.html` is same-origin → permitted. `X-Frame-Options: SAMEORIGIN` (set globally) governs whether *this site can be framed by others*; it does not restrict same-origin children and is preserved unchanged. No cross-origin framing is enabled.

**Conclusion:** the existing landing demo iframe keeps working under the new global header with **NO page-specific `/landing.html` block needed**. None was added (confirmed: the only `_headers` entries are the global `/*` block plus the existing `/*.html`, `/*.js`, `/*.css`, `/sw.js` per-path cache blocks).

## SAFE TO DELETE per-page `<meta>` CSP in Plan 03

**Sign-off:** The HTTP CSP header in `_headers` is verified byte-equivalent to the per-page `<meta>` CSP (automated diff passed; content confirmed identical across all 21 pages). The `depends_on` gate for Plan 03 is satisfied — **Plan 03 (Wave 2) is cleared to delete the 21 `<meta http-equiv="Content-Security-Policy">` tags.**

## Threat Model Outcome

- **T-28-04** (CSP migration tampering): mitigated — header verified byte-equivalent before any meta deletion; no directive weakened; unsafe-inline kept verbatim.
- **T-28-05** (landing iframe clickjacking): mitigated — default-src 'self' + preserved SAMEORIGIN cover the same-origin iframe; no cross-origin framing.
- **T-28-06** (stale security via longer TTL): mitigated — only JS/CSS get 86400; HTML + sw.js stay no-cache.
- **T-28-07** (connect-src scope): accepted — connect-src unchanged, no new egress.

## Deviations from Plan

None — plan executed exactly as written. No CLAUDE.md conflicts (no Lemon Squeezy store interaction; connect-src origin left untouched).

## Verification

- Task 1 automated CSP-equivalence diff: **OK CSP header matches meta verbatim** (confirmed the regex matched the real CSP meta, not OG/viewport).
- Task 2 automated check: **OK TTL raised, HTML+sw.js still no-cache**; grep confirms 0 occurrences of `max-age=3600`.
- Manual spot-check deferred to deploy: landing same-origin demo iframe rendering under the live header (reasoning above covers it; default-src 'self' + SAMEORIGIN).

## Self-Check: PASSED

- FOUND: `_headers` (modified, contains `Content-Security-Policy` and `max-age=86400`)
- FOUND commit 6dc9039 (Task 1 — CSP header)
- FOUND commit 7ba7c10 (Task 2 — cache TTL)
