# Phase 28: Update Reliability & Versioning - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Make installed PWAs (incl. iOS Safari, and the macOS installed web app where the
bug also reproduces) reliably receive and apply app updates; make ONE version
constant the single source of truth that drives the footer label, the
service-worker `CACHE_NAME`, and a runtime integrity self-check that guarantees
the displayed version cannot silently lie; move CSP from per-page `<meta>` tags
to an HTTP header; and lengthen the static-asset cache TTL. Everything stays
fully offline — no phone-home, no new network calls (VER-06).

Out of scope (belongs elsewhere): removing `unsafe-inline` from CSP (future
hardening); the full IndexedDB reset & recover escape hatch (Phase 29, OBS-03);
the persisted error log (Phase 29).

</domain>

<decisions>
## Implementation Decisions

### Versioning (VER-02)
- **D-01:** Single source-of-truth version uses **semver** (`1.2.0` format). Footer renders `v1.2.0`. This milestone ships as **v1.2.0**.
- **D-02:** **Hybrid bump model.** The human semver is hand-set in ONE source-of-truth constant, touched only at a release boundary (not per-deploy). The SW `CACHE_NAME` **and** the integrity token are **auto-derived from the git short-hash at deploy time** — no one ever hand-edits a cache number again (this kills the v209 "forgot to bump → stale cache" failure class at the root). Local / `file://` opens fall back to a `dev` token.
- **D-03:** Bump semantics (durable project convention, recorded in memory `project-version-bump-convention`): **minor** = milestone ship (v1.1→v1.2); **patch** = standalone prod hotfix between milestones; **major** = landmark release, Ben's explicit call. Mid-milestone phase deploys leave the footer semver UNCHANGED (the auto-hash still busts the cache). The footer-bump decision becomes a recurring wrap-up habit so the label never silently drifts again.
- **D-04:** Reconcile existing tooling: the pre-commit `CACHE_NAME`-bump hook (memory `reference-pre-commit-sw-bump`) becomes redundant once the cache name is auto-derived at deploy — remove/replace it. The deploy GitHub Action (today copies files verbatim, no transform) gains a small version-stamp step. Keep the change minimal and visible — do not introduce a general build/bundler step (out of scope).

### Update delivery (VER-01)
- **D-05:** **Apply-on-next-navigation.** Remove the forced mid-page `window.location.reload()` on `controllerchange` (`assets/app.js:693–698`). Because the app is multi-page, an update applies naturally on the next page navigation or app reopen — it never reloads out from under a therapist typing session notes (unsaved form text was the only thing at risk; IDB data was always safe). Keep `skipWaiting()`/`clients.claim` so the new SW takes control; just don't force-reload the open page.
- **D-06:** **Root cause is general SW-update delivery, not an iOS-Safari quirk** — the unreliable-update behavior reproduces on the macOS installed web app too (Ben, this session). Design the fix as a general SW-lifecycle reliability fix (e.g. `registration.update()` on launch/visibilitychange), not an iOS-specific workaround.
- **D-07:** **Field verification (VER-01 manual component): Ben verifies it himself on a macOS installed web app.** That is the accessible repro/verify surface; iOS Safari is opportunistic confirmation, not a blocker.

### Integrity check (VER-03)
- **D-08:** **Fully-local, offline-safe self-check.** Every asset/build is stamped with the same deploy token; at runtime the app verifies the loaded pieces all agree. A token disagreement = stale/partial cache (the v209 "Frankenstein build" of old + new assets). No network, no phone-home (VER-06).
- **D-09:** **Honest footer, always.** The footer never claims a clean version it isn't coherently running; on a detected mismatch it shows a subtle marker (e.g. `v1.2.0 ⚠`).
- **D-10:** **A mismatch nudge whose words always match reality.** On a real mismatch, a small dismissible prompt offers a fix — and its button runs a GENUINE recovery (`registration.update()` → activate new SW → delete stale caches → reload), NOT a cosmetic `location.reload()` (a plain reload won't fix a stale cache — the SW just re-serves the old files; see memory `reference-pwa-sw-cache-updates`).
- **D-11:** **Promise gated on feasibility.** Online → the nudge says "Refresh to complete" (true — recovery can fetch fresh assets). Offline → NO completion promise; it says something honest like "Update pending — reconnect to finish updating," because offline there is nothing to complete with.
- **D-12:** **Honest escalation, never a looped lie.** If the genuine recovery still can't clear the mismatch (rare wedged SW), the nudge degrades to honest guidance ("Couldn't finish automatically…") that hands off to Phase 29's reset & recover escape hatch (OBS-03) and the report-a-problem flow. Phase 28 degrades gracefully; the full recovery hatch is built in Phase 29.

### Claude's Discretion
Delegated by Ben (the "Headers: CSP + cache TTL" area was offered but not selected — sensible defaults below) plus genuinely technical implementation choices:
- **Headers (VER-04/VER-05):** Move CSP from the 21 per-page `<meta http-equiv="Content-Security-Policy">` tags into an HTTP `Content-Security-Policy` header in `_headers`, **content verbatim including `unsafe-inline`** (removing `unsafe-inline` is explicitly out of scope for v1.2). **Delete** the per-page `<meta>` CSP tags once the header is verified equivalent (one source, no drift). Reconcile `landing.html`'s demo-iframe / `X-Frame-Options: SAMEORIGIN` nuance. Raise JS/CSS from `Cache-Control: public, max-age=3600` to `max-age=86400`; HTML stays `no-cache`; SW still owns freshness for installed users.
- **Where the version constant physically lives** and how it is shared between app pages and the SW (e.g. a `version.js` loaded via `<script>` and `importScripts`) — builder's call, must satisfy the single-source-of-truth requirement (VER-02).
- **The integrity-token stamping mechanism** and exactly where the self-check runs in the page lifecycle.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — section "Update Reliability & Versioning (Phase 28)": VER-01…VER-06, plus the "Out of Scope" table (removing `unsafe-inline` is excluded for v1.2)
- `.planning/ROADMAP.md` — section "Phase 28: Update Reliability & Versioning": goal + the 6 success criteria

### Codebase concerns (the source of this milestone)
- `.planning/codebase/CONCERNS.md` — directly relevant entries: "CSP Delivered as `<meta>` Tag, Not HTTP Header"; "Service Worker Cache Version Requires Manual Bump"; "`_headers` Cache TTL for JS/CSS Is Only 1 Hour"; "CSP Uses `unsafe-inline` for Both `script-src` and `style-src`" (context only — removal is out of scope)

No external ADRs/specs beyond the above. Several durable facts live in project
memory and are restated inline in the decisions above so this file is
self-contained: `project-version-bump-convention` (scheme + bump habit),
`reference-pwa-sw-cache-updates` (stale-SW gotchas), `reference-pre-commit-sw-bump`
(the hook to reconcile), `project-footer-version-placeholder` (the placeholder
this phase replaces).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets / touch-points
- `assets/shared-chrome.js:8` — `var APP_VERSION = '1.1.0'` (static placeholder) and the footer render (`renderFooter`, ~line 88). The footer-display side of the single source.
- `sw.js:12` — `const CACHE_NAME = 'sessions-garden-v212'`; the `PRECACHE_URLS` list; `self.skipWaiting()` (~line 159). The cache-name side of the single source.
- `assets/app.js:693–698` — the `controllerchange → window.location.reload()` forced reload (remove for apply-on-next-navigation; keep SW takeover).
- `_headers` — security headers; `/*.js` and `/*.css` at `Cache-Control: public, max-age=3600` (→ `86400`); no CSP entry (→ add header); `/*.html` and `/sw.js` already `no-cache`.
- 21 `*.html` pages carry `<meta http-equiv="Content-Security-Policy">` (sample content in `index.html`) — to delete after the header migration.
- The SW registration inline `<script>` is duplicated across every HTML page (`navigator.serviceWorker.register('/sw.js')`) — any registration-side update logic touches them all.

### Established Patterns
- Zero-build, zero-npm; IIFE-global modules; files served verbatim. The deploy GitHub Action copies files with no transform — the version-stamp step is a small, deliberate, visible addition (NOT a general build step).
- The SW owns cache freshness for installed users; HTML is `no-cache`.
- Inline string objects (`FOOTER_STRINGS` in shared-chrome.js, `DB_STRINGS` in db.js) are the pattern for text that must render before `i18n.js` loads — relevant if the integrity nudge needs strings early in the lifecycle, in 4 languages (EN/HE/DE/CS, RTL-safe).

### Integration Points
- Integrity nudge ↔ **Phase 29**: persist the detected mismatch to the OBS-01 error log; the "Couldn't finish automatically" escalation hands off to the OBS-03 reset & recover escape hatch.

</code_context>

<specifics>
## Specific Ideas

- **"The label must not lie" extends to the fix prompt** (Ben, this session): the refresh nudge's wording must always match reality — truly fix it (online), tell the user to reconnect (offline), or admit it can't and point to real recovery (wedged case). Never "refresh to complete" when a refresh won't.
- This milestone ships as **v1.2.0** (first real, trustworthy footer version).

</specifics>

<deferred>
## Deferred Ideas

- **Remove `unsafe-inline` from `script-src`** (nonce/hash CSP refactor) — explicitly out of scope for v1.2 (REQUIREMENTS "Out of Scope"); the VER-04 header migration keeps the CSP content verbatim. Future hardening.
- **Full IndexedDB reset & recover escape hatch (OBS-03)** and the **persisted error log (OBS-01/02)** — Phase 29. Phase 28's integrity escalation merely hands off to them.
- **Pin/version-track `jspdf.min.js` (HARD-02)** and **backup import file-size guard (HARD-01)** — backlog hardening, unrelated to this phase.

### Reviewed Todos (not folded)
10 pending todos surfaced by keyword match (`todo.match-phase`) — all generic
keyword false-positives (matched on words like "phase", "source", "pwa"), none
about update-reliability/versioning. None folded: PWA install guidance + user
manual, full IndexedDB encryption (v1.2 idea, separate), drag-sort settings
categories, modality templates, in-app onboarding/help, verify landing
translations, stronger deactivation warning, legal compliance remaining fixes,
post-purchase feedback-email research, terms-into-LS-activation flow.

</deferred>

---

*Phase: 28-update-reliability-versioning*
*Context gathered: 2026-06-22*
