# Phase 28: Update Reliability & Versioning - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-22
**Phase:** 28-update-reliability-versioning
**Areas discussed:** Version scheme & bump, Update delivery UX, Integrity-check surface
**Area offered but not selected:** Headers: CSP + cache TTL (delegated to Claude's discretion)

---

## Version scheme & bump

### Q1 — Version format

| Option | Description | Selected |
|--------|-------------|----------|
| Semver (1.2.0) | Footer `v1.2.0`, cache `sessions-garden-1.2.0`; matches milestone naming; one human-meaningful value | ✓ |
| Build counter (213) | Monotonic number, continues today's `v212` scheme; guaranteed-unique but meaningless to humans | |
| Semver + build suffix | `1.2.0+a3f9`; most robust against forgotten bumps but most moving parts | |

**User's choice:** Semver (1.2.0).

### Q2 — Bump mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-edit one constant | Version in one file; bump = change one line. Zero-build, simplest for non-technical maintainer | |
| Auto-derive at deploy | GH Action injects git short-hash; can't be forgotten but footer becomes a hash, adds CI magic | |
| Hand-edit + deploy guard | Hand-edit plus CI check that fails deploy if version unchanged | |

**User's choice:** Free-text — "not sure if there's a downside of auto-derive, but I don't want to manually edit this one."
**Notes:** Claude explained the downsides of pure auto-derive (footer stops meaning anything; what's in git ≠ what's deployed; local/`file://` opens have no version) and proposed a **hybrid**: hand-set human semver for the footer (only at release boundaries) + auto-derive the cache name + integrity token from git short-hash at deploy. Ben accepted the hybrid **on the condition** that the convention + a recurring per-phase/milestone bump-decision habit be baked into project memory — done in `project-version-bump-convention.md` (and `project-footer-version-placeholder.md` updated to point to it).

---

## Update delivery UX

### Q1 — What happens when a new version is available mid-use

| Option | Description | Selected |
|--------|-------------|----------|
| Apply on next navigation | Drop the forced reload; MPA picks up the update on next page click/reopen; zero interruption | ✓ |
| Non-blocking "update ready" toast | Dismissible toast they tap to refresh; safe but needs noticing + 4-lang UI | |
| Keep immediate auto-reload | Current `app.js:695` behavior; can reload mid-form and lose unsaved text | |

**User's choice:** Apply on next navigation.
**Notes:** Anchored on the multi-page architecture — the forced `controllerchange → reload()` is what creates the mid-form-loss risk; an MPA refreshes itself on the next navigation anyway.

### Q2 — iOS field-verification logistics

| Option | Description | Selected |
|--------|-------------|----------|
| Sapir verifies on her iPhone | Doubles as a maintainer dry-run; needs a checklist | |
| Ben verifies | Fastest loop, fully in your control | |
| Defer the sign-off | Ship now, track field sign-off as a follow-up | |

**User's choice:** Free-text — "I will verify myself but notice that this issue is also in MacOS installed Webapp, no need iPhone for that basically."
**Notes:** Key correction — the unreliable-update behavior also reproduces on the macOS installed web app, so verification doesn't depend on an iPhone, and the root cause is general SW-update delivery (not an iOS-Safari quirk). Captured as D-06/D-07.

---

## Integrity-check surface

### Q1 — What the user sees on a detected stale/mismatched build

| Option | Description | Selected |
|--------|-------------|----------|
| Honest footer + refresh nudge | Footer never lies; dismissible "update didn't finish — refresh" prompt with a fix button | ✓ (with caveat) |
| Honest footer only (passive) | Subtle marker, no popup/button; user must know to refresh | |
| Console + error log only | Diagnostics only; invisible to user, footer could still mislead | |

**User's choice:** Free-text — "honest footer + refresh nudge, but all is assuming the refresh will actually solve it. if we need some IT skillset to fix it - then 'refresh to complete' is a lie."
**Notes:** This caveat refined the decision (D-10/D-11/D-12): the nudge's button must run a GENUINE recovery (`registration.update()` → activate new SW → delete stale caches → reload), not a cosmetic reload; the "refresh to complete" promise is gated on being online (offline → "reconnect to finish"); and if real recovery still fails (wedged SW), it escalates honestly to Phase 29's reset & recover escape hatch instead of repeating the lie.

---

## Claude's Discretion

- **Headers: CSP + cache TTL (VER-04/VER-05)** — offered as a selectable area, not chosen. Defaults recorded in CONTEXT: move CSP to an HTTP header in `_headers` verbatim (keep `unsafe-inline` — removal is out of scope), delete the 21 per-page `<meta>` CSP tags, raise JS/CSS TTL to `max-age=86400`.
- Physical location of the version constant and how it's shared between app pages and the SW.
- The integrity-token stamping mechanism and where the self-check runs in the page lifecycle.

## Deferred Ideas

- Removing `unsafe-inline` from `script-src` (nonce/hash CSP) — out of scope for v1.2; future hardening.
- Full IndexedDB reset & recover escape hatch (OBS-03) + persisted error log (OBS-01/02) — Phase 29.
- `jspdf.min.js` version pinning (HARD-02), backup import file-size guard (HARD-01) — backlog.
