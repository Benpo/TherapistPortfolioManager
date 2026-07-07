# Stack Research

**Domain:** In-app help/onboarding + guided-tour engine, in-app changelog, and a docs-maintenance gate — for a live, sold, zero-runtime-dependency vanilla multi-page RTL PWA
**Researched:** 2026-07-07
**Confidence:** HIGH (library license/size facts re-verified this session via `npm pack`; integration points read from live codebase). MEDIUM on the exact docs-gate heuristic (mechanically feasible; final shape is a discuss-phase decision).

> **Framing:** This is a *subsequent* milestone on a shipped app. The honest answer to "what stack additions are needed?" is **almost none** — the correct move is to add ~zero production dependencies and compose existing project plumbing. This document is therefore weighted toward **what NOT to add and why**, plus the three genuinely new engineering surfaces (bespoke tour engine, changelog data format, docs-gate mechanics) and exactly where they wire into `version.js` / `sw.js` / `i18n`.

> **Prior-art reconciliation (do not skip):** The Phase 26 research (2026-05, archived) recommended a **bespoke tour engine "built on `demo-hints.js` patterns."** That premise is now **stale**: `demo-hints.js` was **deleted in Phase 35** (`36cfd68 refactor(35-05): remove dead demo-hints.js + app.js iframe injection`). The bespoke recommendation still holds, but its *pattern source is gone* — new pattern sources are named below. All library facts below were re-verified against current npm (Driver.js has moved 1.4.0 → **1.6.0** since Phase 26).

---

## Recommended Stack

### Core Technologies (production) — ZERO new runtime dependencies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Bespoke tour engine** (`assets/help-tour.js`) | project-owned | ~6–9-step replayable spotlight/overlay tour with graceful degradation | The RTL-safe + dark-mode + garden-token CSS layer is **unavoidable hand-work regardless of engine** (see Driver.js CSS finding); once written, a ~6–9-step tour doesn't justify vendoring a generic positioning engine. Keeps the hard zero-runtime-dep constraint intact. |
| **Structured changelog data** (`assets/changelog.js`) | project-owned | Ships release notes with the app; drives What's-New popup + changelog page | A plain JS data module (`window.CHANGELOG`) mirrors the existing `window.I18N` pattern; version-keyed off `AppVersion.APP_VERSION`; precached by the SW so it's fully offline. No parser, no build, no fetch. |
| **Committed git hook via `core.hooksPath`** (`.githooks/`) + **CI gate step** in `deploy.yml` | project-owned | Docs-maintenance hard gate | The only *unbypassable* layer is the CI step (blocks the Cloudflare deploy); the committed hook is the fast local nudge. Both are zero-dependency shell/node scripts. No husky. |

**Installation:** None. `npm install` count stays exactly where it is (devDeps: `jsdom` only). Nothing reaches `node_modules` in production; Cloudflare ships static `/assets/*`.

### Supporting assets — existing project plumbing to REUSE (not install)

| Asset | Purpose for this milestone | When to Use |
|-------|----------------------------|-------------|
| `assets/version.js` (`AppVersion.APP_VERSION`) | Single source of truth the What's-New popup compares against a stored "last seen version" | Changelog trigger + the changelog page's "current version" marker. **Do not add a second version constant.** |
| `sw.js` `PRECACHE_URLS` | Offline availability of every new file | **Must add** `help.html`, `assets/help.js`, `assets/help-tour.js`, `assets/help.css` (or a help section in `app.css`), `assets/changelog.js`. Missing an entry = feature silently 404s offline. Note the SW comment: `importScripts` path must match the shipped `assets/` path. |
| `assets/i18n-en.js` (`window.I18N.en`, flat dot-keys) | All help/tour/changelog copy as `data-i18n` keys, EN filled first | New keys: `help.*`, `help.tour.*`, `help.welcome.*`, `changelog.*`. HE/DE/CS deferred (EN canonical). |
| `assets/app.js` — `app:language` CustomEvent (dispatched at `app.js:126`) | Re-render tour/help copy on language switch | The tour engine **must** listen for `app:language` (live precedent: `backup-modal.js:502`, `add-session.js:1286`, several in `app.js`) so switching language mid-tour doesn't strand a tooltip in the old language/position. |
| `assets/backup-modal.js` (27 KB) | **New pattern source** for the tour/welcome overlay (replaces the deleted `demo-hints.js`) | Live, current example of a full-screen overlay + `app:language` re-render + focus handling in this codebase's own style. Model the welcome/tour chrome on it. |
| `assets/app.css` + `assets/tokens.css` | Garden design tokens + existing RTL logical-property patterns (`inset-inline`/`margin-inline-start` already present in `app.css`) | The new tour/help CSS uses these tokens + logical properties only — no ad-hoc hex, no physical properties (the Driver.js CSS is the cautionary counter-example). Dark mode via `[data-theme="dark"]`. |
| `#headerActions` container (in `app.js` chrome) | Hosts the persistent "?" entry point beside cloud/gear (44×44, RTL auto-flips) | Global help affordance (Phase 26 D-02). |
| `localStorage` (`portfolio*` convention) | One-shot flags | `portfolioWelcomeSeen` (first-run welcome) and `portfolioLastSeenVersion` (What's-New popup). **Naming note:** existing flags use the `portfolio*` prefix (`portfolioLang`, `portfolioTheme`, `portfolioTermsAccepted`, plus the outlier `securityGuidanceDismissed`). Phase 26 proposed `sg.welcomeSeen` — prefer `portfolio*` for consistency; decide in discuss-phase. |
| `tests/run-all.js` (131-test zero-dep harness) | Behavior tests for the new logic | Add tests for: version-compare popup logic, tour anchor-→-modal fallback, and the docs-gate script itself (it's a pure node function). |

### Development Tools (dev-only, allowed under the zero-*runtime*-dep rule)

| Tool | Purpose | Notes |
|------|---------|-------|
| `.githooks/pre-commit` (committed shell/node) | Local docs-gate nudge | Enabled with a one-time `git config core.hooksPath .githooks`. Committed & version-controlled (unlike `.git/hooks/`), so it travels with the repo and across linked worktrees. |
| CI step in `.github/workflows/deploy.yml` | The **hard** docs-gate | A `node` script (zero-dep) run before the deploy job; failing it fails the run and **blocks the Cloudflare Pages deploy**. This is the only layer a `--no-verify` commit or a cloud/worktree agent cannot skip. |
| `jsdom` (already installed, `^29.1.1`) | Test the new modules | No change — reuse the existing devDependency. |

---

## The tour-engine decision (re-verified this session)

| Option | Verdict | License | Size (measured this session) | RTL / Dark out-of-box | Notes |
|--------|---------|---------|------------------------------|-----------------------|-------|
| **Bespoke** (`help-tour.js`, model on `backup-modal.js` + `app.css` logical-prop patterns) | **RECOMMENDED** | project-owned | est. ~4–8 KB | authored to be RTL/dark-safe from line 1 | Zero-dep; ~6–9 steps; reuses `app:language` + tokens. **Pattern source is now `backup-modal.js`, NOT the deleted `demo-hints.js`.** |
| Driver.js (vendored `assets/vendor/driver.js.iife.js`) | Viable fallback; use its **API shape** as design vocabulary | **MIT** ✓ (v1.6.0, 0 deps — verified) | **21,588 B raw / 6,259 B gzip** JS + **2,986 B raw / 988 B gzip** CSS | **NO** — still ships physical props + hardcoded colors | `npm pack driver.js@1.6.0` confirms: CSS still contains `right:` (×3), `text-align:right`, `margin-left`, `#fff` (×3), `#2d2d2d` (×3), **zero** `[dir=` or `[data-theme]` hooks. RTL/dark CSS layer is unavoidable → vendoring buys little. Same-origin `/assets/vendor/` is CSP-compatible. |
| Shepherd.js | **REJECTED** | **AGPL-3.0** ✗ (verified) | + deps `@floating-ui/dom`, `deepmerge-ts` | n/a | AGPL is hostile to a closed-source EUR 119 product. Also drags transitive deps. |
| Intro.js | **REJECTED** | **AGPL-3.0** ✗ (v8.3.2, verified) | — | n/a | Same AGPL problem; paid commercial license contradicts zero-recurring-cost. |
| Onborda | **REJECTED** | MIT (v1.2.5) | — | n/a | **React/Next.js-only** (needs React context + framer-motion). Framework mismatch — irrelevant to a vanilla no-build app. |

**Why bespoke still wins (the decisive argument, unchanged and re-confirmed):** the RTL-safe, dark-aware, garden-token tour CSS must be hand-authored **regardless of engine** — Driver.js 1.6.0's shipped CSS is still LTR-only, light-only, physical-property. Once that layer exists, vendoring 21 KB of generic positioning to drive ~6–9 steps adds vendored-dependency-update burden for capability mostly unused. Use Driver.js's **v1 API shape as the UI-SPEC's design vocabulary only**: `element` is optional (a step with no element renders as a **centered modal** — exactly the D-11 graceful-degradation primitive); `onNextClick`/`onPrevClick` hooks model a step that navigates cross-page then resumes; `drive(n)` models resume-at-step for multi-page continuity.

---

## Changelog data format (recommendation)

No `CHANGELOG.*` file exists in the repo today (only `.claude/context/` drafts). Recommended shape:

```javascript
// assets/changelog.js  — ships with the app, precached by sw.js
window.CHANGELOG = window.CHANGELOG || [];
window.CHANGELOG.push({
  version: "1.3.0",            // compared against AppVersion.APP_VERSION
  date: "2026-07-XX",         // ISO; render via window.DateFormat (canonical engine)
  // entries reference i18n keys, NOT inline prose, so 4-locale parity is possible later
  highlights: ["changelog.v1_3_0.help", "changelog.v1_3_0.whatsNew", "changelog.v1_3_0.tour"]
});
```

- **Version-keyed off `version.js`**, not a second constant. The What's-New popup fires when `AppVersion.APP_VERSION !== localStorage.getItem('portfolioLastSeenVersion')`; dismiss writes the current version. "Flag absent ⇒ first upgrade sees it once" for free (no migration), same trick as the Phase 26 welcome flag.
- **Copy = i18n keys** (`changelog.*` in `i18n-en.js`), never inline strings — keeps it translatable and consistent with the whole app. EN canonical; HE/DE/CS deferred.
- **Offline:** add `assets/changelog.js` to `sw.js` `PRECACHE_URLS`. (It lives under `assets/`, so `cp -r assets` in `deploy.yml` already ships it — only the SW precache list needs the manual add.)
- **Persistent changelog page** lives inside the help center (`help.html`), rendered from the same `window.CHANGELOG` array — single data source for both popup and page.

---

## Docs-maintenance hard gate — mechanics (concrete, per git event)

**Current state (verified):** there are **no active git hooks** — `.git/hooks/pre-commit` and `pre-push` are empty (0 bytes). `core.hooksPath` currently resolves to the default `.git/hooks`. No husky. (The old "pre-commit skips CACHE_NAME bump" memory note is obsolete — `CACHE_NAME` now auto-derives from `INTEGRITY_TOKEN`, so no bump hook is needed.) This is greenfield for the gate.

**What each mechanism can and cannot deterministically see:**

| Mechanism | Sees | Can block? | Bypassable? | Verdict |
|-----------|------|-----------|-------------|---------|
| **`.git/hooks/pre-commit`** (plain, local) | `git diff --cached --name-only` (staged files) | The commit | `--no-verify`; **not committed** so absent on fresh clones / cloud agents / new worktrees | Weak alone |
| **`.githooks/pre-commit` via `core.hooksPath`** (committed) | same staged file list | The commit | `--no-verify`; needs one-time `git config core.hooksPath .githooks` per clone | **Good local nudge** — version-controlled, travels across linked worktrees (config is repo-scoped, path is repo-relative) |
| **`pre-push`** (committed, same dir) | the whole pushed commit range | The push | `--no-verify` | Better for "the whole branch must touch the changelog" (aggregates across commits) |
| **CI step in `deploy.yml`** (`on: push` to `main`) | full diff of the pushed range, server-side | **The deploy** (fails the job → nothing reaches Cloudflare) | **Not** by `--no-verify`; **not** by cloud/worktree agents | **The actual HARD gate** |
| **GSD definition-of-done gate** | phase artifacts + diff, at agent-workflow level | The phase completion | process-level (agent could skip if not enforced) | Process guarantee, complements the above |

**Recommended layered design:**
1. **Committed `.githooks/pre-commit`** (fast feedback) + **`pre-push`** for branch-level aggregation.
2. **CI step in `deploy.yml`** = the unbypassable gate (fail the run before the deploy job → no Cloudflare deploy).
3. **GSD DoD gate** = the process-level guarantee inside the phase workflow.

**The deterministic heuristic (all three share one zero-dep node script):**
- Define a **"user-facing" path allowlist**: `*.html` (excluding legal pages `impressum*/datenschutz*/disclaimer*`), `assets/*.js` (excluding `tests/`), `assets/*.css`.
- **Rule:** if the diff touches any user-facing path AND touches **neither** `assets/changelog.js` **nor** any `help.*` i18n key / `help.html` / `assets/help*.js`, → **FAIL** with a message naming what's missing.
- **Escape hatch:** an explicit opt-out token (e.g. commit-message `[skip-changelog]` or a marker file) for genuinely non-user-facing changes — because a path heuristic **cannot** distinguish an internal refactor from a user-visible change (its one real limitation; be honest about it in the UI-SPEC).
- Keep the script in `tests/`-style pure node so it's unit-testable against synthetic diffs.

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Shepherd.js / Intro.js** | **AGPL-3.0** — obligates source disclosure of the whole closed-source EUR 119 app (verified 15.2.2 / 8.3.2 this session) | Bespoke engine (Driver.js MIT only as API-shape reference) |
| **Onborda** | MIT but **React/Next.js-only** (React context + framer-motion) — framework mismatch with vanilla no-build | Bespoke vanilla engine |
| **Driver.js as an npm runtime dependency** | Violates the zero-runtime-dep constraint; and its CSS is LTR/light-only so it doesn't "just work" anyway | If ever used, **vendor statically** to `assets/vendor/` + a project-authored token CSS layer — but bespoke is preferred |
| **husky** (for the docs-gate) | Adds an npm dependency + `prepare` script + `node_modules` presence to run one tiny hook, in a repo whose identity is minimalism | Committed `.githooks/` via `core.hooksPath` (zero-dep, shell/node) |
| **Inline changelog/help prose in HTML** | Breaks the i18n single-source model and 4-locale parity | Structured `window.CHANGELOG` data + `data-i18n` keys |
| **IndexedDB for the seen-version / welcome flags** | Heavyweight; async; no precedent for one-shot UI flags | `localStorage` (`portfolio*` convention) — proven, sync, "absent ⇒ first-run" |
| **`beforeinstallprompt`-based one-tap install on iOS** | It **does not exist** on iOS Safari — the button would silently do nothing | Per-browser illustrated instructions (Safari iOS = Share → Add to Home Screen) |
| **A second version constant for the changelog** | Two sources of version truth will drift (the v209 incident lesson) | Read `AppVersion.APP_VERSION` from the existing `version.js` |
| **Modeling the tour on `demo-hints.js`** | **That file was deleted in Phase 35** (`36cfd68`) — the Phase 26 premise is stale | Model on the live `backup-modal.js` overlay + `app.css` logical-property patterns + `app:language` event |

---

## Stack Patterns by Variant

**If the tour grows beyond ~10–12 steps or needs complex auto-repositioning on scroll/resize:**
- Reconsider vendoring **Driver.js 1.6.0** (MIT, 6.3 KB gzip) as `assets/vendor/driver.js.iife.js` + a project-authored `driver-theme.css` (token-mapped, logical-property, `[data-theme]`-aware).
- Because at that surface area the positioning math it provides starts to earn its 21 KB; below that, bespoke is leaner.

**If the docs-gate proves too noisy (false "user-facing" positives on refactors):**
- Lean harder on the `[skip-changelog]` escape hatch + keep the CI gate as the only *blocking* layer, downgrading the local hook to a warning (`exit 0` with a message).
- Because a path heuristic can't read intent; better a low-friction nudge + one unbypassable server-side gate than a hook everyone learns to `--no-verify`.

**If HE/DE/CS help content is pulled forward (currently deferred):**
- No stack change — it's additional `i18n-he/de/cs.js` `help.*` keys. Budget for RTL tooltip length variance (Hebrew/German run longer) via flexible-height, `min/max-width`, logical-property tooltip containers.

---

## Version Compatibility

| Package / asset | Compatible With | Notes |
|-----------------|-----------------|-------|
| (no new runtime packages) | — | Production dependency count unchanged; `node_modules` never deploys |
| Driver.js 1.6.0 (*if* fallback) | evergreen browsers; vanilla, no build | Ships `driver.js.iife.js` (global `window.driver`) — drop-in `<script>`; **its CSS must be replaced**, not shipped as-is |
| `jsdom ^29.1.1` (dev, existing) | Node ≥18 (existing `engines`) | Reused for new behavior tests; no bump needed |
| New files ↔ `sw.js` | `sw.js` `PRECACHE_URLS` | Every new production file **must** be added to the precache list or it 404s offline |
| New files ↔ `deploy.yml` | `cp -r assets` already covers `assets/*`; root `*.html` covered by `cp *.html` | `help.html` at repo root ships automatically; only the SW precache list needs manual edits |
| Changelog/welcome flags ↔ CSP | `_headers` CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'` | All-local logic is fine; a vendored Driver.js under `/assets/vendor/` is same-origin and CSP-compatible |

---

## Sources

- `npm pack driver.js@1.6.0` + local `gzip`/`grep` (this session) — version 1.6.0, **MIT**, 0 deps; IIFE 21,588 B raw / 6,259 B gzip; CSS 2,986 B raw / 988 B gzip; CSS still physical-property + hardcoded `#fff`/`#2d2d2d`, no `[dir]`/`[data-theme]` — **HIGH**
- `npm view shepherd.js|intro.js|onborda version license dependencies` (this session) — Shepherd 15.2.2 AGPL-3.0 (+@floating-ui/dom, deepmerge-ts); Intro.js 8.3.2 AGPL-3.0; Onborda 1.2.5 MIT (React) — **HIGH**
- Live codebase (read this session): `assets/version.js`, `sw.js` (PRECACHE_URLS + importScripts note), `.github/workflows/deploy.yml`, `assets/i18n-en.js`/`i18n.js`, `_headers` CSP, `package.json`, `.git/hooks/*` (empty), `git config core.hooksPath`, `git log -- assets/demo-hints.js` (deleted `36cfd68`), `app:language` dispatch/listeners, `localStorage` flag inventory, `backup-modal.js` overlay precedent — **HIGH**
- `.planning/milestones/v1.1-phases/26-.../26-RESEARCH.md` (Phase 26, 2026-05) — prior art; conclusions re-verified, `demo-hints.js` premise found stale — **MEDIUM (as prior art)**
- MDN "Making PWAs installable" (no `beforeinstallprompt` on iOS) — corroborated from Phase 26, not re-fetched this session — **MEDIUM**

---
*Stack research for: in-app help/onboarding + changelog + docs-maintenance gate on a live zero-dep vanilla RTL PWA*
*Researched: 2026-07-07*
