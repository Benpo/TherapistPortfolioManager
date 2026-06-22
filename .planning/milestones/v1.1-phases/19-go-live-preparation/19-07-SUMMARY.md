---
phase: 19-go-live-preparation
plan: 07
subsystem: infra
tags: [github-actions, cloudflare-pages, deploy-branch, security-headers, ci-cd]

# Dependency graph
requires:
  - phase: 19-go-live-preparation
    provides: CONTEXT.md D-07 to D-10 deployment decisions, _headers baseline
provides:
  - GitHub Action workflow that syncs app-only files to deploy branch on push to main
  - Production security headers in _headers for Cloudflare Pages
affects:
  - 19-go-live-preparation plan 08 (LIVE-04 — CF Pages dashboard setup consumes deploy branch)
  - sw.js (deploy branch watches this file)

# Tech tracking
tech-stack:
  added: [github-actions, actions/checkout@v4]
  patterns:
    - deploy-branch pattern — ephemeral branch rebuilt from scratch on each push
    - explicit cp file list for deploy isolation (no rsync wildcards)
    - sensitive file verification step in CI pipeline

key-files:
  created:
    - .github/workflows/deploy.yml
  modified:
    - _headers

key-decisions:
  - "Deploy branch is force-pushed fresh on every main push — no history, fully ephemeral"
  - "Explicit cp commands (not rsync) for auditable, exact include list matching D-08"
  - "Verification step in CI rejects deployment if .planning/, .claude/, CLAUDE.md, or .env detected"
  - "No CSP in _headers — already in HTML meta tags; adding here would be additive and break inline scripts"
  - "No HSTS — Cloudflare Pages handles HTTPS automatically"
  - "Explicit /sw.js no-cache rule — service worker must never be long-cached so browsers check for updates"

patterns-established:
  - "Security verification in deploy CI: whitelist-based cp + denylist check prevents planning/dev file leaks"
  - "_headers global /* rule for security headers + specific path rules for cache control"

requirements-completed: [LIVE-03]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 19 Plan 07: Deploy Pipeline + Security Headers Summary

**GitHub Action deploy workflow syncing app-only files to ephemeral deploy branch via explicit cp whitelist, with production security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) added to _headers for Cloudflare Pages.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-24T19:30:00Z
- **Completed:** 2026-03-24T19:35:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- GitHub Actions workflow created at `.github/workflows/deploy.yml` — triggers on push to main, uses concurrency cancel-in-progress to prevent race conditions, copies only app-layer files (D-08 include list), verifies no .planning/.claude/CLAUDE.md/.env leaked, force-pushes deploy branch
- Cloudflare Pages security headers added to `_headers` — global `/*` rule for 4 security headers, explicit `/sw.js` no-cache rule, no CSP (already in HTML meta tags per Phase 16 decisions)
- No manual secrets required — workflow uses auto-provided `GITHUB_TOKEN`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GitHub Action deploy workflow** - `b5a414f` (feat)
2. **Task 2: Enhance _headers with production security headers** - `cb5085d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `.github/workflows/deploy.yml` - CI pipeline: push to main → sync app files → verify clean → push deploy branch
- `_headers` - Added global security headers + explicit /sw.js no-cache rule

## Decisions Made
- No wrangler-action used — deploy branch approach gives CF Pages native git integration (commit SHAs, preview URLs)
- GITHUB_TOKEN is auto-provided by GH Actions — no CF API token or account ID needed in this plan (LIVE-04 handles CF dashboard setup)
- Explicit `cp` list over rsync: each file category is auditable and maps directly to D-08 include list
- CSP intentionally omitted from _headers — Phase 16 audit established CSP in HTML meta tags; _headers CSP would be additive and could break inline scripts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None at this stage. Cloudflare Pages dashboard configuration (connecting the repo, selecting deploy branch, setting custom domain) is covered by LIVE-04 in Plan 08.

## Next Phase Readiness
- Deploy branch infrastructure is ready — CF Pages can be configured to watch the `deploy` branch
- Security headers will serve automatically once CF Pages is connected
- Plan 08 (LIVE-04) handles the CF Pages dashboard setup: connect repo, select deploy branch, set custom domain, verify end-to-end deploy

---
*Phase: 19-go-live-preparation*
*Completed: 2026-03-24*
