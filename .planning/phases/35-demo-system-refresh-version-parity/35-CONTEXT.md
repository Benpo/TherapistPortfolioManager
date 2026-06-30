# Phase 35: Demo System Refresh / Version Parity - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Bring the landing-page demo back into parity with the live app so prospective buyers see *today's* product, not the March 2026 version.

**Key reframe established during discussion (read this first):** the demo is **NOT a second app**. It is the **real app running in demo mode**, switched on by `window.name === 'demo-mode'` and threaded through the live shared code:
- `assets/db.js` swaps to the isolated `demo_portfolio` IndexedDB.
- The inline license/terms gate on every page short-circuits (`if (window.name==='demo-mode') return;`).
- `assets/app.js` and `assets/backup-modal.js` have their own demo-mode branches.

`window.name` survives navigation, so the **whole app is reachable and already demo-aware** — a visitor can add/edit sessions, browse, use snippets, etc., all on isolated demo data. This was confirmed against the live site (Ben) and the code.

**The only "fork" is the home screen.** `demo.html` is a copy of the real home page `index.html` that **predates the `shared-chrome.js` header refactor**. `index.html` was upgraded to inject its header/nav/lang-picker/footer from `assets/shared-chrome.js`; `demo.html` kept the **old hand-typed native `<select>` language picker** and never loaded shared-chrome. That single un-converged page + a stale seed snapshot are the entire staleness surface.

**This phase unstales — it does not rebuild and does not create a separate app.**

**In scope:**
- Converge `demo.html`'s home shell so it can never silently drift again (single-source the chrome).
- Refresh the seed data (`assets/demo-seed-data.json`) — showcase the flagship Heart Shield feature, a believable clinical arc, self-freshening dates.
- Terminology / i18n parity on demo-specific copy.
- Delete the orphaned guided-tour file.

**Out of scope (deferred — see Deferred Ideas):**
- Locking down what the demo *exposes* — **scope updated 2026-06-30 (see D-09):** hiding **backup / export / license** controls in demo mode is now IN scope; **Settings** lock-down and broader hardening of production-grade controls remain out of scope. Ben's call: "update now, block some in the future."
- Reviving a guided onboarding tour.
- Localizing the seed's clinical sample text into HE/DE/CS.

</domain>

<decisions>
## Implementation Decisions

### Home-screen chrome convergence (root-cause fix for drift)
- **D-01:** Stop `demo.html` from drifting by **single-sourcing its chrome from `assets/shared-chrome.js`**, exactly as `index.html` does (empty `#headerActions` + `#nav-placeholder` filled by shared-chrome; drop the hand-typed native `<select>` language picker). After this, the demo home header/nav/lang-picker/footer is identical to the real app by construction and cannot fall out of sync again. This directly implements Ben's "single-source chrome" durability choice.
- **D-02:** Planning/research MAY evaluate the stronger form — **collapsing `demo.html` into `index.html` + a demo flag/entry bootstrap** (so there is literally no separate home page to maintain). Treat as a preferred direction to assess, not a locked requirement; the non-negotiable outcome is "demo home chrome comes from one source." `shared-chrome.js` likely needs a small demo-mode awareness (preserve the demo banner; decide footer/version display inside the iframe) — flag for research.
- **D-01/D-02 RESOLVED (2026-06-30, post-research):** **D-01 chosen** (chrome-only single-sourcing). Research recommended D-02 (collapse into `index.html` via iframe `name="demo-mode"`) but Ben chose the minimal-blast-radius D-01 path: it makes the demo home chrome current and drift-proof without the D-02 browser-timing checkpoint (assumption A1) or surfacing index.html's full backup/export modal on the demo home. The demo overview *body* stays as-is this phase. Per research: `shared-chrome.js` needs **no** demo-specific change; render BOTH the banner (already present, owned by `app.js initDemoMode`) and the version footer inside the iframe (the footer is the on-screen version-parity signal and the concrete fix for "demo home has no footer").

### Seed data refresh (the demo's story)
- **D-03:** **Showcase Heart Shield (מגננת הלב).** The flagship v1.1 clinical feature is currently invisible — the existing 11 demo sessions have zero `isHeartShield`/`shieldRemoved`. Add Heart Shield session(s) with a believable removal/progression arc. Keep the existing client-type variety (adult / child / animal / other).
- **D-04:** "Mostly just unstale it" — **add a few more sessions** and refresh content; do not over-engineer a brand-new dataset. The current 7 clients / 11 sessions shape is a fine base.
- **D-05:** **Authoring + approval:** Claude drafts a clinically coherent seed (Heart-Shield-forward, realistic emotion names + before→after severity arc, matching the *current* schema in `db.js`). **Ben + Sapir approve the draft on Ben's machine before it ships** (Sapir is the domain owner; she signs off on clinical authenticity).

### Anti-restaleness — dates
- **D-06:** **Relative / computed-at-seed-time dates.** `assets/demo-seed.js` should derive session/client dates from offsets relative to "now" at seed time (e.g. last session ≈ today−Nd, oldest ≈ today−90d), guaranteeing ≥1 "session this month" so the dashboard never looks abandoned. This makes the demo self-freshen forever and kills the "looks dead" rot permanently. (`Date.now()` here is normal runtime app code — fine.)

### Terminology / i18n parity
- **D-07:** **UI + terminology parity, English sample content.** Sweep `demo.html`'s hand-typed strings and any demo-specific copy (subtitle, the "live demo" banner, etc.) to current 4-language terminology (מפגש/לקוח; "energy" not "therapeutic"). **Seed clinical content (trappedEmotions / comments / insights / customerSummary) stays English sample text shown to all locales** — acceptable for sample data; localizing it is deferred.

### Dead code
- **D-08:** **Delete `assets/demo-hints.js`** (372-line pulsing-dot guided tour). Recoverable from git history if onboarding is ever wanted. **Correction (research 2026-06-30):** it is NOT "loaded by no page" — it is dynamically injected by `app.js` (the demo-hints block, ~L735-740; locate by content, not line number) in iframe context AND precached in `sw.js` (PRECACHE_URLS). Clean deletion = **three coordinated edits**: remove the file, the `app.js` injection block, and the `sw.js` precache entry (SW install tolerates the 404 via `allSettled`, so it is hygiene not a hard blocker).

### Demo exposure lock-down (scoped in from deferred — Ben 2026-06-30)
- **D-09:** **Hide/disable Backup, Export/Import, and license-activate controls when `window.name === 'demo-mode'`.** A scoped slice of the previously-deferred exposure lock-down, pulled into this phase per Ben (he does not want backup working in the demo). Use the existing demo-mode seam (`backup-modal.js` already has a demo-mode guard ~L295; `app.js initDemoMode` runs in demo mode). Scope: the Backup cloud button, Export/Import, and license activate/deactivate. **Settings** and any broader hardening remain deferred. Keep it a focused vanilla-JS guard (hide/disable in demo mode), not a redesign; the real data boundary remains the `demo_portfolio` DB-name isolation — this is UX-level exposure reduction on top of it.
  - **D-09 scope refinement (2026-06-30, after reviewing backup paths against the code):** The pre-existing `backup-modal.js:295` guard blocks **import/restore** in demo, but the **export flow (`openExportFlow`) is NOT demo-guarded** — inconsistent. So **also add a demo guard to `openExportFlow`** (mirror the L295 import guard: toast + early-return) and assert it in the exposure test. **Documented residual, explicitly DEFERRED to the future Settings exposure phase:** the **Settings → Backups tab** (schedule + OS folder picker) stays reachable in demo because `settings.js` has no demo guard and the gear mounts in demo — Ben's call (Tighten export now, defer Settings, 2026-06-30). So after this phase: home backup entries hidden + restore blocked + export blocked; Settings→Backups remains operable until the deferred lock-down.

### Claude's Discretion
- Exact number/spread of added sessions and the specific emotion/issue content of the draft (subject to Ben+Sapir approval per D-05).
- Mechanics of the relative-date model (offset table vs. computed) — implementation detail for planning.
- Whether the demo banner / version footer renders inside the iframe after chrome convergence — propose during research.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The demo system (this phase's primary surface)
- `demo.html` — the forked home shell to converge onto shared-chrome (D-01).
- `index.html` — the **canonical** home page; the shared-chrome convergence target. Compare `demo.html` against this.
- `assets/shared-chrome.js` — the single-source chrome (header / `#nav-placeholder` / `#headerActions` lang-picker / footer) to adopt; may need a demo-mode branch.
- `assets/demo-seed-data.json` — the stale seed snapshot to refresh (Heart Shield, +sessions, relative dates).
- `assets/demo-seed.js` — the seeder; deletes+reseeds `demo_portfolio` on demo-home load. Relative-date logic (D-06) lands here.
- `assets/demo.js` — demo language-sync controller (postMessage from landing parent).
- `assets/demo-hints.js` — **to delete** (D-08).
- `landing.html` §`#demo` (~L215–239) — embeds the demo via `#demo-iframe src="./demo.html"` with resize handles; the demo entry point. Any change to the demo entry/home filename must keep this working.

### Schema & demo-mode plumbing (source of truth the seed must match)
- `assets/db.js` — `DB_NAME` switch on `window.name` (L2), `DB_VERSION` + migrations = **the current schema the seed must conform to** (issues[], `isHeartShield`/`shieldRemoved`, `sessionType` clinic/online/other, etc.).
- `assets/overview.js` — renders the home dashboard (stats incl. "Sessions This Month" — why relative dates matter).
- `assets/app.js` (~L264) — demo-mode hook (`if (window.name !== 'demo-mode') return;`).
- `assets/backup-modal.js` (~L295) — demo-mode guard in the backup flow.

### Provenance
- `.planning/phases/32-readme-code-comments/32-COMMENT-COVERAGE-MAP.md` (L64) — flagged the demo group "low priority, stale (deferred demo-refresh phase)"; the seed of this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`window.name === 'demo-mode'`** is the established, app-wide demo switch (db.js / app.js / backup-modal.js / per-page gate). Preserve it; the refresh must not break it. The demo is "the real app in demo mode" *because* of this seam.
- **`shared-chrome.js` injection pattern** (`#headerActions` + `#nav-placeholder` left empty in HTML, filled by JS) is the convergence target for D-01 — already proven on `index.html` and the inner pages.
- **`demo-seed.js` reseed-on-home** already deletes + reseeds `demo_portfolio` on each demo-home load. Note the side effect: returning to the demo home resets a visitor's in-demo edits — acceptable demo behavior, but be deliberate about it when adding relative dates.

### Established Patterns
- **Heart Shield session fields:** `isHeartShield`, `shieldRemoved` (Phase 9 session-level redesign, migration v3). Status is computed by scanning a client's sessions at render time — the seed just needs the flags set correctly across a client's session history to tell a coherent arc.
- **Current session schema keys:** `clientId, date, sessionType (clinic|online|other), issues[{name,before,after}], trappedEmotions, insights, limitingBeliefs, additionalTech, customerSummary, comments`.
- **Zero-dependency production rule** — demo is production-shipped (Cloudflare Pages); vanilla JS/JSON only, no new runtime deps.

### Integration Points
- Landing iframe (`landing.html #demo-iframe`) → demo home → real app pages, all in demo mode via persisted `window.name`.
- Language sync: landing posts `{type:'demo-lang'}` → `demo.js` → `App.setLanguage`. After chrome convergence, confirm the shared-chrome lang-picker and this postMessage sync coexist.

</code_context>

<specifics>
## Specific Ideas

- Ben's framing (verbatim intent): the demo should be "like a real app with just demo data" that's "always up to date like the regular app" — which the discussion confirmed is already the architecture. The phase's job is to make the **one un-converged page** (the home shell) and the **stale seed** live up to that, not to introduce a parallel app.
- Ben flagged a real future concern: exposing *everything* (settings, backup, export, license) in the demo "is also not really good for us." Explicitly deferred this phase, but it is a known, wanted follow-up.
- The "looks abandoned" signal (4-month-old dates) is the single worst conversion-killer found — D-06 (relative dates) is the highest-leverage fix.

</specifics>

<deferred>
## Deferred Ideas

- **Demo exposure lock-down** — **PARTIALLY PULLED INTO SCOPE 2026-06-30 (see D-09):** Backup/Restore, Export/Import, and license activate/deactivate are now hidden/disabled in demo mode *this* phase. **Still deferred:** Settings lock-down and any broader hardening of production-grade controls. Ben: "update now, block some in the future."
- **Guided onboarding tour** (own future phase): if buyer onboarding is ever wanted, rebuild a pulsing-dot tour fresh (the deleted `demo-hints.js` is in git history as a starting point; its targets/copy need re-verifying against current UI).
- **Localized seed content** (HE/DE/CS sample session text): would need Sapir to author localized clinical samples; matters more if a Hebrew-audience live-demo push (e.g. the conference) needs it. English sample content ships this phase.

</deferred>

---

## ⚠ Implementation timing & concurrency (Ben's explicit constraint)

Captured here so it is not lost before planning/execution:

- Phase **34** (Session PDF Export — Visual Polish) is **executing in another window**, plus a third process — both in isolated git worktrees (`.claude/worktrees/agent-*`).
- This phase's files (`demo.html`, `demo-seed*.js`, `demo-seed-data.json`, `demo-hints.js` deletion, `index.html` chrome, `shared-chrome.js`) have **low overlap** with phase 34's surface (`pdf-export.js`, add-session visual polish). The realistic overlap is `app.js` and `shared-chrome.js` if both phases touch them.
- **Discussing and planning 35 now is safe.** **Do NOT run two `execute-phase` orchestrators against the same working tree concurrently** — they would collide on the shared git index and `STATE.md`. Execute phase 35 **after phase 34's executor finishes**, or in an **isolated worktree**.
- This discuss session deliberately **did not run the git-commit or STATE.md-update steps** (to avoid racing phase 34's `STATE.md` writes). Commit `35-CONTEXT.md` (+ `35-DISCUSSION-LOG.md`) and record the session **once phase 34 execution is done**.

---

*Phase: 35-demo-system-refresh-version-parity*
*Context gathered: 2026-06-29*
