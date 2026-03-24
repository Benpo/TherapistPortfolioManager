# Handoff: CF Pages Deployment Issues — 2026-03-24

## Situation

Phase 19 (Go-Live Preparation) is **code-complete** — all 8 plans executed, 5 rounds of UAT fixes applied. The app works perfectly on localhost. The problem is **deployment to Cloudflare Pages** — several CF-specific behaviors are causing issues.

## What's Deployed

- **GitHub Action** (`.github/workflows/deploy.yml`): On push to `main`, copies app-only files to `deploy` branch (force-push). Works correctly.
- **Cloudflare Pages**: Watches `deploy` branch. Custom domain `sessionsgarden.app` active with SSL.
- **DNS**: Migrated from Porkbun to Cloudflare. Zoho Mail MX/SPF/DKIM records preserved.

## Active Bugs (all CF Pages specific)

### 1. Service Worker caching redirect responses → infinite loops
**Root cause:** CF Pages has "pretty URLs" — it auto-strips `.html` extensions and serves `index.html` when you request `/index`. The SW's cache-first strategy was caching these 301/302 redirect responses, then re-serving them forever.

**Attempted fix (in latest commit d2469e9):** SW now skips navigation requests for extensionless URLs (`event.request.mode === 'navigate' && !pathname.includes('.')`). Cache bumped to v27. **Not yet verified** — needs testing with cleared SW cache.

**To test:** Open incognito → DevTools → Application → Clear site data → navigate to `https://sessionsgarden.app`

### 2. Demo iframe broken — "Response served by service worker has redirections"
**Root cause:** The landing page embeds `demo.html` in an iframe. CF Pages serves `/demo` (extensionless) which triggers a redirect. The SW intercepts the iframe request, caches the redirect, and loops.

**Partial fix applied:** `X-Frame-Options` changed from `DENY` to `SAMEORIGIN` in `_headers`. But the SW redirect caching is the real blocker.

**Should be fixed by** the SW fix above (skip extensionless navigation). If not, the iframe `src` may need to use `./demo.html` explicitly, and the SW may need to handle iframe requests differently.

### 3. Licensed user redirect loop: landing → index → disclaimer → landing
**Flow:** User on landing page with active license clicks "Already have a license?" → auto-detect fires → redirects to `./index.html` → `index.html` terms gate checks `portfolioTermsAccepted` (missing because cleared during deactivation testing) → redirects to disclaimer → something bounces back to landing.

**Fix applied (commit 5693b59):** Auto-detect now checks `portfolioTermsAccepted` before redirecting — sends to disclaimer first if terms not accepted. **Not yet verified** due to SW caching issues blocking all testing.

**Correct flow should be:** Landing → auto-detect → disclaimer (accept terms) → index.html → app loads.

### 4. `_redirects` file: `/ /landing.html 302`
This redirects the root URL to the landing page. Works correctly but interacts with SW caching. The redirect itself is fine — the problem is the SW caching the 302 response.

## Files Changed During Deployment Debugging

| File | What Changed |
|------|-------------|
| `_headers` | `X-Frame-Options: DENY` → `SAMEORIGIN` |
| `_redirects` | Created: `/ /landing.html 302` |
| `.github/workflows/deploy.yml` | Added `_redirects`, `LICENSE`, `README.md` to deploy copy |
| `sw.js` | Skip extensionless navigation, bump v26→v27 |
| `assets/landing.js` | Auto-detect checks `portfolioTermsAccepted` before redirect |
| `LICENSE` | Created (proprietary) — prevents GH showing license.html as License tab |
| `README.md` | Created |
| `impressum*.html` | Phone number removed (all 4 languages) |

## CF Pages Behaviors to Know

1. **Pretty URLs**: CF auto-serves `foo.html` when you request `/foo` and strips `.html`. This means `./index.html` links work, but the URL bar shows `/index`.
2. **`_redirects` file**: Simple redirect rules. Format: `from to status_code`.
3. **`_headers` file**: Custom response headers. Already has security headers.
4. **Preview deployments**: CF deploys BOTH `main` (preview) and `deploy` (production) branches. Preview deploys from `main` expose `.planning/` files. **Need to disable preview deployments** in CF Pages Settings → Builds & deployments.
5. **Service Worker + Pretty URLs conflict**: The SW precaches `/index.html` but CF serves it at both `/index.html` AND `/index`. Requests to `/index` are redirects, not direct file serves. The SW must not cache these redirects.

## What Needs to Happen Next

1. **Verify SW fix works** — clear all site data, test in incognito
2. **If SW still loops** — consider more aggressive fix: SW only handles requests for URLs in the PRECACHE_URLS list (exact match), passes everything else to network
3. **Demo iframe** — if still broken after SW fix, change iframe src from relative to absolute path with `.html` extension
4. **Disable CF preview deployments** — Settings → Builds & deployments → disable preview builds for `main` branch
5. **Test full E2E flow** — landing → buy → redirect → license → activate → terms → app

## Key Commits (Phase 19 + deployment)

```
d2469e9 fix: SW skips extensionless navigation requests, never caches redirects
5693b59 fix: auto-detect redirect checks terms before sending to app
37b9c56 fix: X-Frame-Options SAMEORIGIN for demo iframe, restore .html redirect
556f768 fix: remove redirect loop — CF Pages auto-strips .html extensions
e0e44f6 fix: add extensionless URL redirects for CF Pages
76ead91 fix: remove phone number from all Impressum pages
a687574 docs: add proprietary LICENSE file
13a5095 fix(19): security note uses data-i18n for language-reactive rendering
cadf8a3 fix(19): legal page footer disclaimer links open as readonly
4a5c23b fix(19): license page hover — use legal-topbar instead of app-nav
55996f3 fix(19): UAT round 4 — hover, i18n keys, import error, passphrase rules
ad0d2f2 fix(19): UAT round 2 — terms gate, backup UX, i18n, hover fix
0952a17 fix(19): UAT fixes — 6 issues from manual testing
```

## State of Planning

- Phase 19: code-complete, VERIFICATION.md exists (status: human_needed for LIVE-04 deploy verification)
- ROADMAP.md: Phase 19 marked complete
- STATE.md: Updated with all UAT decisions and deployment decisions
- v1.2 feature backlog: Created at `.planning/research/v1.2-feature-backlog.md`
- 17 pending todos documented

## How to Resume

```
/gsd:debug
```
Focus: CF Pages deployment — SW redirect caching, demo iframe, licensed user redirect flow. All issues are deployment-environment-specific (work fine on localhost).
