# Project Research Summary

**Project:** Sessions Garden (TherapistPortfolioManager_app) — Milestone v1.3 "In-App Help, Onboarding & Changelog"
**Domain:** Subsequent-milestone integration — in-app help/help-center, first-run welcome + replayable guided tour, in-app changelog/What's-New, PWA install guidance, and a docs-maintenance hard gate — bolted onto a **live, sold, zero-runtime-dependency vanilla multi-page RTL PWA**
**Researched:** 2026-07-07
**Confidence:** HIGH

## Executive Summary

This is not a greenfield "build a help system" project — it's four new surfaces being integrated into a running, sold product with real users, an existing first-run stack, an existing offline cache, and an active DOM refactor in progress. All four research passes converge on the same core stance: **add ~zero new dependencies, reuse existing plumbing exhaustively, and treat the actual risk as integration risk, not construction risk.** The correct build is a bespoke tour engine (Shepherd.js/Intro.js are AGPL and legally incompatible with a closed-source EUR-119 product; Driver.js is MIT but ships LTR/light-only CSS that must be replaced anyway, so vendoring buys little), a plain-data changelog keyed off the single existing `AppVersion.APP_VERSION` constant, and a docs-maintenance gate implemented as layered enforcement (fast local hook → unbypassable CI step before deploy → GSD Definition-of-Done) rather than one fragile mechanism.

The recommended approach mirrors the app's own conventions everywhere possible: one IIFE module per surface (`help.js`, `welcome.js`, `tour.js`, `changelog-data.js`), `data-i18n` keys for all copy (EN canonical, HE/DE/CS deferred with an explicit readable-EN fallback — never raw keys), `localStorage` one-shot flags for "seen" states, `sessionStorage` for cross-page tour resume, and mounting everything inside the existing `initCommon()` chrome layer. The single highest-leverage new abstraction is a **first-run coordinator** (`first-run.js`) — today five independent surfaces (legal/license gates, security note, iOS A2HS banner, integrity nudge, and now welcome + What's-New) can all want the screen on one load; without one decision point they will collide, confuse users, and in the worst case teach a feature to someone who hasn't passed the legal gate yet.

The key risks are almost all "looks done but isn't" traps that pass every online/jsdom test and fail only for real users: new files never added to the hand-maintained `sw.js` precache lists (silent 404 for exactly the offline users the product is sold on); a version-keyed popup that assumes deploy = instant update, when installed PWAs can run a stale service worker for days (documented project history); a welcome overlay that flags a 6-month paying customer as brand-new; and overlay positioning that is green in jsdom/Chromium but breaks in real Safari/WebKit RTL (this project has a proven Safari-blind-spot track record). Every one of these has a cheap, concrete test or verification step documented in PITFALLS.md — the roadmap should treat those as non-negotiable Definition-of-Done items per phase, not optional polish.

## Key Findings

### Recommended Stack

Zero new production dependencies. The three genuinely new engineering surfaces are all project-owned: a bespoke tour engine (`assets/help-tour.js` / `tour.js`), a structured changelog data module (`window.CHANGELOG`, versioned off `version.js`), and a docs-maintenance gate built from committed git hooks (`core.hooksPath`) plus a CI step in `deploy.yml`. `demo-hints.js` — the pattern source the archived Phase 26 research recommended modeling the tour on — was deleted in Phase 35; the current pattern source is `assets/backup-modal.js` (a live full-screen overlay with `app:language` re-render and focus handling in this codebase's own idiom).

**Core technologies:**
- **Bespoke tour engine** (project-owned, ~4–8 KB): the RTL-safe/dark-aware/token-based CSS layer is unavoidable hand-work regardless of engine (verified: Driver.js 1.6.0's shipped CSS is still LTR-only, light-only, hardcoded hex, zero `[dir]`/`[data-theme]` hooks) — once written, vendoring 21 KB of generic positioning for ~6–9 steps isn't worth the dependency-update burden.
- **`window.CHANGELOG` / `changelog-data.js`** (project-owned, mirrors the `window.I18N` pattern): version-keyed off the existing `AppVersion.APP_VERSION` — never a second version constant, which would drift (the "two sources of version truth" lesson).
- **Committed `.githooks/` + CI step in `deploy.yml`** (zero-dep shell/node): the CI step is the only layer that isn't bypassable by `--no-verify` or a cloud/worktree agent — it's the actual hard gate; the hook is just a fast local nudge.
- **Rejected:** Shepherd.js / Intro.js (AGPL-3.0 — obligates source disclosure of a closed-source paid product); Onborda (MIT but React/Next.js-only — framework mismatch); husky (adds an npm dep + `node_modules` presence to run one tiny hook, contrary to the repo's zero-dep identity).

### Expected Features

Four surfaces: (A) Help system, (B) first-run welcome + guided tour, (C) changelog/What's-New, (D) PWA install nudge. Phase 26 (archived, 2026-05) already locked most of this shape and re-verifies as current best practice in 2026 (self-paced, non-forced onboarding; iOS still has no `beforeinstallprompt`).

**Must have (table stakes):**
- Persistent "?" entry point in `#headerActions`, reachable from every page — TS-1
- Help-center page as durable single source of truth, workflow/task-organized (not a feature catalog) — TS-2/TS-3
- First-run welcome offering a genuine choice ("take the tour" / "explore myself"), fires once, dismiss-persistent, re-openable only from "?" — TS-4/TS-5
- Empty-state coaching with deep-links into Help — TS-6
- What's-New popup on version change, once per version, suppressed on the very first-ever launch — TS-7/TS-8
- Persistent changelog page, reverse-chronological, grouped by version, plain-language — TS-9/TS-10
- Per-browser PWA install *instructions* (never a fake universal button — iOS Safari has no programmatic install) — TS-11
- RTL-safe + dark-mode + token compliance on every new surface — TS-12 (cross-cutting, non-negotiable)
- A written first-run precedence rule so surfaces never stack (the AF-6 collision)

**Should have (differentiators):**
- DF-1 Replayable guided tour, ~6–9 steps, every step degrades gracefully (highest value, highest fragility — the app's core "make it yours" personalization + "you are the only backup" privacy story surfaced through it)
- DF-5 Optional, dismissable, non-nagging PWA install nudge on top of the instructional baseline
- DF-9 Changelog written for practitioners, not developers (benefit-led, no jargon, no git-log dump)
- DF-7 Troubleshooting decision tree for the local-only data model (defer until install/activation content is stable)

**Defer (v2+ / after EN stabilizes):**
- HE/DE/CS translation of all new help/tour/changelog copy — EN canonical first, native review later (AF-12)
- Rich-text changelog authoring (explicitly deferred to v1.4 per milestone note)
- Video walkthroughs / external docs site

**Anti-features to actively avoid:** forced linear tutorials that block the app (AF-1); nagging install banners (AF-2); a fake universal install button (AF-3); full-screen blocking changelog modals (AF-4); multiple onboarding surfaces firing at once (AF-6); auto-launching the tour without consent (AF-8); email/push release announcements (AF-11, no email channel by design — would create a GDPR processor obligation the local-only model exists to avoid).

### Architecture Approach

The app is a no-build, per-screen HTML app where every page calls one shared entry point, `App.initCommon()`, which mounts chrome into two fixed DOM hooks. All three new pillars attach there: an idempotent "?" mount (mirrors the existing `initSettingsLink()` pattern), a first-run coordinator that decides which *one* of up to five competing first-run surfaces shows per load, and a tour engine that persists `{tourId, stepIndex}` to `sessionStorage` to survive full-page navigation (this app has no SPA router). Two current-state gotchas the roadmap must not miss: `report.html` never calls `initCommon()` (so a chrome-mounted "?" won't appear there — decide coverage explicitly), and the existing footer "update available" nudge is an **integrity-mismatch** signal, not a release announcement — it must not be conflated with the new What's-New popup.

**Major components:**
1. **`help.js` / `help.html`** — help-center page render + `Help.openHelpCenter()` deep-link API; single source of truth, workflow-spine IA plus a technical-tips track.
2. **`welcome.js` + `first-run.js` coordinator** — first-run overlay and the single decision point that also owns What's-New, the integrity nudge, the security note, and the install nudge, so at most one attention surface shows per load.
3. **`tour.js` + `data-tour` anchors** — bespoke step engine; anchors are new HTML edits across ~4 pages; engine degrades to a centered modal + "Take me there" link when an anchor is missing, never silently skips.
4. **`changelog-data.js` + What's-New popup + changelog page section** — one structured data source rendering both the popup (latest entry) and the persistent page (full history), living inside the help center.
5. **`sw.js` PRECACHE_URLS/PRECACHE_HTML edits** — every new file must be added or it silently 404s offline; this is a manual, hand-maintained list with no build-time safety net.
6. **Docs-gate scripts** (`scripts/docs-gate.sh`, committed `.githooks/`, CI step) — shared logic between the local nudge and the unbypassable CI gate.

**Suggested build order** (dependency-reasoned, from ARCHITECTURE.md): foundations/coordinator → help center → empty-state deep-links → welcome → tour engine + anchors → changelog data/popup/page → install nudge consolidation → docs gate (landed last, so it doesn't block its own sibling commits).

### Critical Pitfalls

1. **Offline 404 via forgotten precache entries** — every new `.html`/`.js`/`.css` must be added to `sw.js`'s hand-maintained `PRECACHE_URLS`/`PRECACHE_HTML`; write a static test that parses the SW and fails if any new help/changelog file is missing, and verify with a real offline navigation on an installed PWA (jsdom cannot catch a precache miss).
2. **Version-keyed popup vs. stale service workers** — installed PWAs can run old code for days after deploy; key the popup off the *same* `version.js` constant that ships with the content (never a separately fetched value), only mark "seen" after actual render/dismiss, and unit-test the full matrix (fresh install, same version, one-version bump, skipped version, rollback).
3. **Welcome overlay insults existing customers** — "flag absent ⇒ first run" conflates "new to the app" with "new to this feature"; detect pre-v1.3 signals (existing `portfolioLang`/license/IDB data) to branch upgrader vs. fresh-install copy — this is an explicit product decision to surface to Ben, not a default to inherit.
4. **First-run attention collision** — up to five surfaces (legal/license gates, security note, iOS banner, welcome, What's-New) can want the screen on one load; write down a single precedence order, gate welcome behind legal+license, make welcome and What's-New mutually exclusive per launch, and verify on a real device (not jsdom).
5. **Tour anchor rot + silent skip** — `data-tour` anchors sit on a DOM that's actively being refactored; add a jsdom test asserting every anchor referenced by a tour step exists, and make "missing anchor → centered modal fallback" the *tested* behavior, never a silent no-op.
6. **jsdom/Chromium-green ≠ Safari-safe** — this project has a proven Safari/WebKit blind spot (viewBox-only SVG collapses, RTL positioning escapes viewport); overlay/tooltip positioning must be verified with Playwright WebKit + on-device Safari, never jsdom alone.
7. **Docs gate gets `--no-verify`'d into theater** — for a solo maintainer + AI agents, a git hook has no real enforcement threat model; match precisely (not `assets/*` broadly), provide a logged escape token instead of relying on `--no-verify`, and treat the GSD Definition-of-Done gate as the real enforcement layer with the hook as a fast reminder.

## Implications for Roadmap

Based on combined research, suggested phase structure (7 phases, dependency-ordered):

### Phase 1: Foundations — first-run coordinator, version-seen storage, i18n scaffolding
**Rationale:** Every other surface renders copy and competes for first-run screen space; standing up shared plumbing first prevents every downstream collision and drift risk research flagged.
**Delivers:** `first-run.js` coordinator (priority-ordered, pure decision function), `sg.welcomeSeen`/`sg.lastSeenVersion`-equivalent storage semantics seeded correctly for both fresh installs and upgraders, base `help.*`/`changelog.*` i18n key scaffolding.
**Addresses:** the cross-cutting "First-run precedence rule" requirement (FEATURES.md), sets up TS-4/TS-7 preconditions.
**Avoids:** Pitfall 3 (welcome-as-new-user), Pitfall 4 (attention collision) — both are architectural decisions that are cheap to get right here and expensive to retrofit later.

### Phase 2: Help Center — help.html, help.js, nav entry, "?" header mount, EN content, empty-state deep-links
**Rationale:** The help page is the link target for deep-links, tour fallbacks, and the changelog page — nothing else should be built before it exists to point at.
**Delivers:** TS-1/TS-2/TS-3/TS-6 — persistent "?" entry, workflow-organized help-center page, empty-state coaching deep-links.
**Addresses:** TS-1, TS-2, TS-3, TS-6, DF-2/3/4/6/8 (tone, privacy/backup framing, deep-links).
**Avoids:** Pitfall 1 (precache the new page+assets in the same phase, not later); Pitfall 8 groundwork (use i18n keys, not hardcoded terminology, so relabels propagate).

### Phase 3: Welcome & First-Run Onboarding
**Rationale:** Depends on the coordinator (Phase 1) and benefits from Help existing (Phase 2) for its "take the tour" / "learn more" CTA.
**Delivers:** TS-4/TS-5 — full-screen welcome overlay with an explicit upgrader-vs-fresh-install decision baked in and tested.
**Addresses:** TS-4, TS-5; explicitly resolves the Pitfall-3 tradeoff (a discuss-phase decision, not a default).
**Avoids:** Pitfall 3, Pitfall 4 (welcome always gated behind legal+license, never same-launch as What's-New).

### Phase 4: Guided Tour Engine
**Rationale:** The most fragile pillar — bespoke engine, cross-page resume, graceful degradation, no template since `demo-hints.js` was deleted. Sequenced after Help (needs a "Take me there" target) and the coordinator.
**Delivers:** DF-1 — `tour.js` + `data-tour` anchors across ~4 pages, anchor-presence test, degrade-to-modal fallback, `app:language` re-render.
**Addresses:** DF-1.
**Avoids:** Pitfall 5 (anchor rot/silent skip), Pitfall 6 (Safari/WebKit positioning) — both need dedicated verification steps in this phase's Definition-of-Done, not just `npm test` green.

### Phase 5: Changelog & What's-New
**Rationale:** Needs the version-seen storage from Phase 1 and a render target (Help page, Phase 2) already in place; v1.3's own release notes become the first entry.
**Delivers:** TS-7/TS-8/TS-9/TS-10 — `changelog-data.js`, What's-New popup, persistent changelog page section.
**Addresses:** TS-7, TS-8, TS-9, TS-10, DF-9.
**Avoids:** Pitfall 2 (stale-SW version mismatch), Pitfall 9 (i18n leakage across locales), Pitfall 10 (double-signal against the existing SW update-ready nudge — coordinate explicitly, don't build in isolation).

### Phase 6: PWA Install Guidance
**Rationale:** Lowest priority in the first-run precedence order; consolidates an existing inline iOS banner rather than building from scratch. Sequenced after the coordinator exists to govern it.
**Delivers:** TS-11 (per-browser instructions in Help, closing the folded install TODO) + optionally DF-5 (non-nagging proactive nudge).
**Addresses:** TS-11, DF-5.
**Avoids:** AF-2/AF-3 (nagging banner, fake universal button).

### Phase 7: Docs-Maintenance Hard Gate
**Rationale:** Must land *last* within the milestone so v1.3's own changelog/help edits are already in place — otherwise the gate blocks its own sibling commits. Depends on Phase 5's `changelog-data.js` shape to parse against.
**Delivers:** committed `.githooks/pre-commit` + `scripts/docs-gate.sh` (shared logic) + CI step in `deploy.yml` (the real unbypassable gate) + a GSD Definition-of-Done gate.
**Addresses:** the milestone's third pillar (docs-maintenance hard gate).
**Avoids:** Pitfall 7 (gate rot / reflexive `--no-verify`) — precise path matching, logged escape hatch, and tested gate logic (blocks user-facing-no-changelog, passes test-only commits, passes on the escape token) are Definition-of-Done items for this phase, not stretch goals.

### Phase Ordering Rationale

- **Coordinator before any surface that competes for the first-run screen** — every research file independently flags first-run collision (AF-6 / Pitfall 4) as the single most likely cross-surface bug if surfaces are built in isolation.
- **Help center before anything that links into it** — tour fallbacks, empty-state deep-links, and the changelog page all target `help.html`; building it early removes a dangling-link risk from every later phase.
- **Tour after Help, before Changelog** — the tour is the highest-complexity/highest-fragility surface (no template exists since `demo-hints.js`'s deletion); isolating it in its own phase keeps its Safari/WebKit and anchor-rot verification from blocking the lower-risk changelog work.
- **Docs gate last** — it is designed to guard *future* user-facing changes; building it before the milestone's own help/changelog content exists would make it block its own sibling commits.

### Research Flags

Phases likely needing deeper research/design discussion during planning:
- **Phase 3 (Welcome & First-Run Onboarding):** the upgrader-vs-fresh-install detection is an explicit product decision (two defensible options in PITFALLS.md) that Ben should weigh in on before implementation — flag for `/gsd-discuss-phase` emphasis, not necessarily a technical research spike.
- **Phase 4 (Guided Tour Engine):** highest technical fragility in the milestone — no live pattern source (`demo-hints.js` deleted), cross-page resume, RTL/WebKit positioning history of Safari-only bugs in this repo. Consider `--research-phase` or at minimum a dedicated WebKit verification pass baked into the plan.
- **Phase 7 (Docs-Maintenance Hard Gate):** the *mechanics* are already fully specified (STACK.md/ARCHITECTURE.md give concrete layering); what needs a decision is the exact "user-facing path" heuristic and escape-hatch token — a discuss-phase conversation, not open-ended research.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Foundations):** mirrors existing `showFirstLaunchSecurityNote()`/`resolveIntegrityState()` patterns already in the codebase.
- **Phase 2 (Help Center):** standard per-page HTML pattern already used by every other page in the app (`SharedChrome`, `renderNav()`, `data-i18n`).
- **Phase 5 (Changelog & What's-New):** data shape and trigger logic are fully specified in STACK.md/ARCHITECTURE.md (Option A recommended, semver-compare pure function).
- **Phase 6 (PWA Install Guidance):** per-browser instructional content is a well-documented, non-technical pattern (MDN/web.dev sources corroborated).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Library license/size facts re-verified this session via `npm pack`/`npm view` against live npm registry; all integration points (version.js, sw.js, i18n) read directly from the current codebase with file:line citations. |
| Features | HIGH | Behavior semantics corroborated across 2025–2026 current-best-practice sources (Keep a Changelog, web.dev, MDN, Fluent 2, Intercom) plus the app's own prior Phase 26 design pass, itself re-verified as still correct. MEDIUM only on exact competitor tour *mechanics* (inferred from public material, not internal access). |
| Architecture | HIGH | Every claim grounded in live source with `file:line` citations; Phase 26's prior art explicitly reconciled against current source, with two stale premises identified and corrected (`demo-hints.js` deleted, `data-tour` anchors not yet in production). |
| Pitfalls | HIGH for integration pitfalls (derived from this repo's own verified constraints and shipped-incident memory — precache-bump hook bug, Safari PWA update lag, WebKit visual-gate blind spots are all documented prior incidents, not speculation); MEDIUM for general tour/gate community best practices (public material, corroborated against this codebase). |

**Overall confidence:** HIGH

### Gaps to Address

- **First-run precedence exact ordering:** ARCHITECTURE.md presents three defensible options (strict single-queue coordinator / mutually-exclusive first-run branch / layered-by-surface-type); the roadmap should pick one explicitly in discuss-phase for Phase 1 rather than let it default.
- **Upgrader-vs-fresh-install detection signal:** which pre-existing `localStorage`/IndexedDB signal to use (`portfolioLang` presence vs. client/session count > 0) is not yet decided — a Phase 3 discuss-phase item.
- **Changelog data format (Option A vs B):** Option A (thin data + i18n keys) is recommended and this summary assumes it, but it's formally still an open discuss-phase decision per ARCHITECTURE.md.
- **"?" entry coverage on `report.html`/legal/landing pages:** these pages don't call `initCommon()` and have no app chrome; the roadmap should explicitly decide (and scope into a phase) whether they get a help entry at all, rather than let it silently be absent.
- **Exact docs-gate "user-facing path" heuristic and escape-hatch token:** mechanically feasible per STACK.md, but the precise allowlist/denylist and the escape-hatch syntax are Phase 7 discuss-phase decisions, not yet locked.
- **Tour length threshold:** if the tour grows beyond ~10–12 steps or needs complex scroll/resize repositioning, STACK.md flags reconsidering vendoring Driver.js — worth a checkpoint if Phase 4 scope grows during planning.

## Sources

### Primary (HIGH confidence)
- Live codebase (this session): `assets/app.js`, `assets/version.js`, `assets/shared-chrome.js`, `sw.js`, `index.html`, `report.html`, `assets/i18n-en.js`, `assets/overview.js`, `.github/workflows/deploy.yml`, `.git/hooks/*`, `package.json`
- `npm pack driver.js@1.6.0` + `npm view shepherd.js|intro.js|onborda` (license/size/dependency verification, this session)
- `.planning/PROJECT.md` (v1.3 scope, constraints, offline/zero-dep/4-locale rules, single-source `version.js`)

### Secondary (MEDIUM confidence, corroborated)
- Archived Phase 26 research (`.planning/milestones/v1.1-phases/26-.../26-RESEARCH.md` + `26-UI-SPEC.md`) — prior art, re-verified with two stale premises corrected
- Keep a Changelog (keepachangelog.com); AnnounceKit / Easydesk / Beamer changelog-practice guides
- web.dev "Patterns for promoting PWA installation"; MDN "Making PWAs installable" (no `beforeinstallprompt` on iOS)
- Fluent 2 Design System onboarding guidance (one modal at a time); Intercom product-tour guidance
- Product Fruits "Building Unbreakable Product Tours" (data-attributes over CSS classes, graceful missing-element handling)
- This repo's own incident memory: `reference-pre-commit-sw-bump`, `reference-sw-version-update-delivery`, `reference-pwa-sw-cache-updates`, `reference-webkit-chromium-svg-visual-verification`, `reference-rtl-select-value-alignment-headless`, P37 TERM-01/02 terminology-drift precedent

### Tertiary (LOW/MEDIUM confidence, flagged for validation)
- Exact competitor tour *mechanics* (SimplePractice/Jane/Carepatron) — inferred from public marketing/support material, not internal access; structural/tonal conclusions independently corroborated, step-mechanics illustrative only

---
*Research completed: 2026-07-07*
*Ready for roadmap: yes*
