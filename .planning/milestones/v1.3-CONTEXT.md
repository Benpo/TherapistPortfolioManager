# MILESTONE-CONTEXT — v1.3 "In-App Help, Onboarding & Changelog"

**Authored:** 2026-07-06 (hand-authored scoping doc; input for a future `/gsd-new-milestone` run)
**Status:** INERT until v1.2 ships — no workflow reads this file before Ben runs `/gsd-new-milestone`.
**Supersedes:** the "v1.3 Codebase Health II" pencil-in at `ROADMAP.md:363`. Ben decided (2026-07-06)
that v1.3 = Help + Changelog + Docs-maintenance hard-gate. Broader extraction / test-coverage
health remains a backlog candidate for a later milestone
(`todos/pending/2026-06-26-broader-extraction-and-test-coverage-health.md`).

---

## 1. Milestone header

**v1.3 — In-App Help, Onboarding & Changelog**

**Goal (one sentence):** Every Sessions Garden practitioner can learn the whole app *inside* the
app (welcome, replayable tour, help center) and hears about every release *inside* the app
(What's-New popup + changelog page) — and a hard process gate guarantees both stay current with
every future user-facing change.

---

## 2. Why now / drivers

1. **The app is feature-large and self-explanation-poor.** v1.2.4 shipped today (2026-07-06 — the
   Phase 34–37 tail, on the order of 90 commits) on top of a stable, sold product (live since
   v1.1, 2026-06-22, EUR 119 one-time, >10 live users). There is **no in-app way to teach the
   feature set**: zero help/onboarding/tour surfaces exist in production (verified — no `help.*`
   i18n keys, no welcome overlay, no tour code).
2. **Releases are invisible to users.** Today's release had **no announcement channel**. There is
   no changelog UI or data structure anywhere in the app (verified by grep). Ben hand-drafted a
   user-facing changelog for v1.2.4 (`.claude/context/2026-07-06_changelog-v1.2.4-users.md`) with
   nowhere to put it.
3. **GDPR-safe comms.** >10 live users purchased via Lemon Squeezy with **no email-marketing
   consent** collected. In-app announcement is the compliant (and zero-network-consistent)
   release-communication channel.
4. **The design work is already done.** Phase 26 (2026-05-16) produced an approved UI-SPEC
   (6/6 checker PASS), benchmark research, four clickable sketches, and locked decisions
   D-01…D-15. Phase 32 additionally produced a complete, prioritized help **topic tree**
   (`32-HELP-CONTENT-INVENTORY.md`). v1.3 is primarily an **implementation** milestone.
   **Qualifier (from the source todo's v1.1-close build breadcrumb):** two P26 deliverables
   remained open — the **EN content outline was never authored** and the **sketch winner was
   never selected**. So v1.3 contains real content-*writing* work (seeded by the UI-SPEC copy
   table + the topic tree, not started from zero) plus the IA pick (open question #1).
5. **Docs rot is the known failure mode.** Without enforcement, help + changelog will go stale the
   first phase after they ship. Ben's explicit rule: development will intentionally get slower
   because docs become part of "done" — **that trade is accepted**.

---

## 3. Decided scope — three pillars (Ben settled these; do not re-litigate)

### Pillar 1 — Help System (implement the Phase 26 design; reuse, not redesign)

Three modes, exactly as designed in Phase 26:

- **(a) Onboarding tour** — replayable interactive overlay tour with graceful degradation (D-11):
  spotlight on stable `data-tour` anchors when present; centered modal + "Take me there" link when
  absent — never a silent skip. Launched from the full-screen **welcome overlay** on first run
  after activation (D-09/D-15) and replayable any time from the "?" entry.
- **(b) Contextual "quick help"** — per Phase 26's locked composition this is **NOT** a distributed
  per-screen panel system (explicitly deferred in 26-CONTEXT); it is **deep-links into the single
  Help page** + **empty-state coaching** (existing empty-state strings gain links into the relevant
  Help section — the "zero-engine third leg" formalized in 26-UI-SPEC).
- **(c) Full help center page** — a new standalone page (per-page pattern), single source of truth,
  workflow-spine IA (D-03; sketch 002 — variant A/B/C still open), flagship personalization story
  led early (D-04), technical-tips track as a clearly separated parallel band (D-05/D-06).

**Entry point:** persistent "?" in `#headerActions` beside cloud + gear (D-02; sketch 004 validated
the header icon over a floating button — "learned location beats one-time salience"). Globally
reachable on every app page.

**Lifecycle architecture (Ben's explicit concerns — write these as requirements):**
- **When the tour first fires:** first launch after activation (D-09), gated by a new
  `localStorage` flag (`sg.welcomeSeen`, D-15 — verified net-new). Existing users upgrading into
  v1.3 see the welcome exactly once (flag absent ⇒ first-run; zero migration). Must be reconciled
  with the two existing first-run surfaces (see Reconciliation Notes §10.5).
- **How users replay it:** the "?" entry re-opens the welcome/tour any time; the Help page is
  persistently browsable (D-01, D-07).
- **How quick-help is discovered with no menu bar:** the "?" is in the header on every app page;
  the Help page also gets a nav entry via `renderNav()`; empty states deep-link into Help.

**Content:** EN canonical, workflow-first, comprehensive coverage of the **current** (v1.2.4)
feature set — Claude drafts from real app behavior, Sapir reviews for clinical accuracy/tone
(D-12). Seeded directly by the Phase 32 topic tree (§9). DE/CS/HE translation deferred (noted as
future work). Human-written-from-scratch is explicitly NOT required.

**Folded todo (Ben, 2026-07-07 — the FULL todo scope is in-scope for v1.3):**
`.planning/todos/pending/2026-03-24-pwa-install-guidance-and-user-manual.md` (originally folded
into Phase 26 via D-06). Its user-manual/getting-started scope (access via URL/bookmark/install,
how offline works, backups & why they matter, activation on a new browser + the 2-activation
limit, deactivate/transfer, troubleshooting cleared-cache/lost-data/re-activation) lands in the
help center technical track (H-2/H-6). Its **in-app install prompt** is now an explicit feature
(H-9). Its "linkable from post-purchase email" idea is open question #16. Close the todo when
v1.3 ships.

### Pillar 2 — In-app Changelog

**Placement = BOTH** (decided):
- A **"What's New" popup** shown once when the app's version changes under the user, and
- a **persistent changelog page/section inside the help center**.

**Rationale to record:** GDPR-safe release comms (no email consent exists; in-app is the compliant
channel); consistent with the zero-network principle (content ships with the app); today's
~90-commit release proved the gap. Tone/format seed: Ben's v1.2.4 draft
(`.claude/context/2026-07-06_changelog-v1.2.4-users.md`) — warm, user-benefit-first, grouped by
theme, "everything stays on your device" reassurance closing.

**Mechanics to capture as open questions** (§8): popup trigger tied to the existing single version
source (`window.AppVersion.APP_VERSION`, hand-set in `assets/version.js:25`), history depth,
dismissal behavior, per-language copy.

### Pillar 3 — Documentation-Maintenance HARD GATE (the keystone)

A **hard** mechanism so help + changelog never go stale. Two sides:

- **App-artifact side:** the changelog data + help content that must be kept current with every
  user-facing change.
- **Process side:** a **hook** (pre-commit / pre-ship) and/or a **GSD Definition-of-Done gate**
  that **BLOCKS** completing/shipping a phase containing user-facing changes until the changelog
  entry + affected help content are updated. Strong enforcement, friction accepted — Ben
  explicitly wants "we never miss this."

**Record:** dev velocity intentionally slows in exchange for always-current docs — accepted.
**Flag for the roadmap:** the process side lives partly **outside the app** (repo tooling:
`.claude/hooks`, a GSD workflow customization, or a skill) — it is a repo-tooling deliverable, not
app code, and needs its own phase treatment. Note: the repo currently has **zero active git
hooks** (verified — `.git/hooks` holds only samples; the old CACHE_NAME pre-commit bump was
replaced by the Phase 28 deploy-token mechanism), so a docs-gate hook would be the first.
**Open:** what counts as a "user-facing change" (§8).

---

## 4. Target features by category (specific, testable, user-centric)

### Help System

- **H-1 "?" entry point:** a therapist on ANY app page (index, sessions, reporting, add-client,
  add-session, settings) sees a "?" icon in the header beside the cloud and gear icons; clicking it
  reaches Help. Inline SVG, 36×36 visual in a 44×44 tap target, `.is-active` state mirroring
  `.settings-gear-btn`, RTL auto-flip, dark-mode aware (26-UI-SPEC Interaction Contract).
- **H-2 Help page:** a new `help.html` (+ `assets/help.js`) following the per-page pattern, with a
  nav entry via `renderNav()` and the `SharedChrome` footer. Organized as: workflow spine (7
  steps: add client → start session → capture emotions → Heart-Wall → severity → review & export →
  overview) + "Making Sessions Garden yours" personalization section led early + separated
  technical-tips band (backups, PDF export, per-browser PWA install, "data never leaves your
  browser", 2-device activation/transfer, troubleshooting).
- **H-3 Welcome overlay:** on the first app launch after activation (and once for existing users
  upgrading into v1.3), a full-screen branded garden welcome appears with two CTAs — "Take the
  guided tour" (accent) / "I'll explore myself" (neutral, first-class). Either CTA or completing
  the tour sets `sg.welcomeSeen`; afterwards it never auto-fires again and is re-openable only via
  "?". Esc dismisses.
- **H-4 Replayable tour:** ~6–9 steps along the workflow spine, bound ONLY to dedicated
  `data-tour="…"` attributes (net-new instrumentation across pages). Every step degrades per D-11:
  anchor present & visible → spotlight + tooltip; anchor missing/hidden → centered modal with the
  same i18n text + a working "Take me there" link — NEVER a silent skip. Cross-page steps navigate
  and resume (state in `sessionStorage`). Tour re-renders on the `app:language` event. Testable:
  delete any anchor → the step still renders as the fallback modal.
- **H-5 Empty-state coaching:** existing empty-state copy (e.g. `overview.clients.empty`) gains a
  deep-link into the matching Help section. Pure copy + link; no new engine.
- **H-6 Content coverage:** every leaf of the Phase 32 topic tree has help copy — including the
  areas Phase 26 didn't enumerate: license activation & trial, 2-device transfer, "I don't see my
  clients" troubleshooting, Report-a-problem (Phase 29), and the Phase 37 additions (Session
  Formats incl. custom formats, date-format personalization, new filters/sorting). EN canonical,
  all strings `data-i18n`-keyed `help.*` (keys present in all 4 locale files, EN filled first).
- **H-7 Design-system fidelity:** all new surfaces compose `assets/tokens.css` semantic tokens
  only (no ad-hoc hex), logical properties only (RTL-safe), `[data-theme="dark"]` aware, Rubik
  400/700 only, noun/gerund headings (Hebrew noun/infinitive rule, Phase 24 D-05).
- **H-8 PWA correctness:** `help.html` + new assets are added to `sw.js` `PRECACHE_URLS` so Help
  works fully offline on installed PWAs.
- **H-9 Install nudge (from the folded 2026-03-24 todo):** after activation, a friendly,
  dismissable, **non-nagging** "Install Sessions Garden" affordance for users who haven't
  installed the PWA — per-browser instructions only (Chrome/Edge: address-bar install icon; iOS
  Safari: Share → Add to Home Screen, illustrated — no programmatic prompt exists there; Android:
  menu → Install), NEVER a single universal Install button (26-RESEARCH Pitfall 4). Must
  reconcile with — likely replace — the existing per-session iOS banner at `index.html:362-374`.

### In-app Changelog

- **C-1 What's-New popup:** when a user opens the app after a deploy that changed
  `APP_VERSION`, they see a "What's New in vX.Y.Z" summary once; dismissing it records the seen
  version and it does not reappear until the next version change. Works fully offline (content
  ships with the app; comparison is local).
- **C-2 Changelog page:** a persistent, scrollable release-history section inside the help center
  showing at minimum the current release's user-facing changes; older entries per the
  history-depth decision (§8).
- **C-3 Content format:** entries follow the v1.2.4 seed's register — grouped by user-visible
  theme, benefit-first phrasing, closing privacy reassurance. Stored as a structured in-app data
  source (i18n-capable), not scraped from git.
- **C-4 First entry:** v1.3's own release notes ship in v1.3 (self-hosting proof of the pipeline);
  backfill depth per §8.

### Docs-Maintenance Hard-Gate

- **G-1 Blocking gate:** a phase/ship flow that contains user-facing changes CANNOT be completed
  until (a) a changelog entry for those changes exists and (b) the affected help topics were
  updated or explicitly marked unaffected. The gate FAILS LOUDLY (blocks), not warns.
- **G-2 Mechanism:** hook (pre-commit/pre-push/pre-ship) and/or GSD Definition-of-Done
  customization and/or a skill — decision in §8; requirement is only that it is HARD.
- **G-3 Definition:** a written, checkable definition of "user-facing change" the gate applies
  (open question §8 — candidate anchor: any diff touching shipped app HTML/CSS/JS or i18n values,
  vs. tests/planning/tooling).
- **G-4 Release-habit integration:** the gate hooks the existing release convention — the hand-set
  `APP_VERSION` bump in `assets/version.js` is the natural "release moment" the changelog entry
  must exist for (see memory: per-phase/milestone bump-decision habit).

---

## 5. Key context & constraints

- **Zero-network / offline-first (hard):** CSP is an HTTP header (`_headers:2`) allowing only
  same-origin + `https://api.lemonsqueezy.com` (license). The only outbound link in app chrome is
  a `mailto:`. Help, tour, welcome, and changelog must all work fully offline and add **zero**
  external requests. This directly constrains the demo-videos idea (§8).
- **Vanilla + zero production dependencies (hard):** no npm runtime deps, no build step. The tour
  engine is bespoke (26-RESEARCH: Shepherd/Intro are AGPL — rejected; Driver.js MIT is a
  documented *API-shape* reference only, <30KB budget if ever vendored). Dev/test tooling npm is
  allowed (Phase 30 decision).
- **4 languages + RTL:** EN/HE/DE/CS, Hebrew RTL primary reference user (Sapir). All new strings
  `data-i18n`-keyed, EN-first; Hebrew noun/infinitive rule; logical CSS properties only; tour
  tooltips must survive HE/DE length variance (flexible height, min/max width).
- **Multi-page app, no global menu bar:** one HTML page per screen; nav exists only on app pages
  via `renderNav()` (`app.js:137-156` — currently 5 entries + divider, no Help). `report.html` has
  chrome placeholders but never calls `initCommon()` → no nav/header icons there. Legal/marketing
  pages (landing, license, disclaimer/impressum/datenschutz) have no app chrome at all. The "?"
  and the What's-New popup therefore reach exactly the app pages — coverage decision for
  `report.html`/license page in §8.
- **Live customers:** >10 practitioners, EUR 119 one-time, sold under Sapir's Gewerbe. No consented
  email channel → in-app is the GDPR-safe announcement path. Nothing in v1.3 may disturb existing
  data or the activation gates.
- **Version/update plumbing (Phase 28, current):** single source `assets/version.js` —
  hand-set `APP_VERSION` ('1.2.4') + deploy-stamped `INTEGRITY_TOKEN` (git SHA via `deploy.yml`);
  SW `CACHE_NAME` auto-derives; `version.js`/`sw.js` are no-cache; footer shows the version + an
  integrity warning/nudge. The What's-New popup should hang off `APP_VERSION`, not the SW/token
  layer. New pages/assets require `PRECACHE_URLS` edits (manual — the old pre-commit bump hook no
  longer exists).
- **Design system reuse:** garden/botanical identity, `tokens.css` two-tier tokens, existing
  illustrations, dark mode via `[data-theme]` — the welcome/help must feel like the same product
  (D-10). 26-UI-SPEC's spacing/typography/color contract governs all new surfaces.
- **First-run gate stack (current):** three `<head>` gates on `index.html` (license → terms →
  license-complete) redirect before the app renders; the welcome overlay can only fire after all
  pass. An existing post-activation surface (`showFirstLaunchSecurityNote()`, 7-day recurring,
  `securityGuidanceDismissed`) and a per-session iOS A2HS banner already compete for first-run
  attention (§10.5).
- **Maintainer reality:** Ben solo + Claude Code agents; docs/tooling calibrated for that workflow.
  Sapir = clinical/tone reviewer and business owner, not a developer.
- **Testing bar:** runtime-behavior features need falsifiable behavior tests before implementation
  (project rule; the tour fallback, welcome gating, and popup trigger are all testable seams).
  Chromium-only visual gates miss Safari bugs — plan WebKit checks for the new overlay surfaces
  (Phase 37 lesson).

---

## 6. Decisions already locked (do not re-open)

**Ben, 2026-07-06 (this milestone):**

| # | Decision |
|---|----------|
| V13-1 | Milestone split: v1.3 = Help + Changelog + Docs-hard-gate ONLY. Rich-text editor is a separate future milestone (v1.4). |
| V13-2 | Changelog placement = BOTH: What's-New popup on version bump AND a persistent changelog page in the help center. |
| V13-3 | Docs-maintenance is a HARD GATE (hook and/or GSD DoD block). Friction accepted; slower dev accepted. |
| V13-4 | Content authorship: Claude drafts EN canonical copy from real app behavior; Sapir reviews for clinical accuracy/tone (inherits P26 D-12). Human-written-from-scratch NOT required. |
| V13-5 | Help design is REUSE of Phase 26, not a redesign. v1.3 implements that design + the two new pillars. |

**Inherited from Phase 26 (2026-05-16; still binding unless §10 marks them stale):**

| D-xx | Decision (short) |
|------|------------------|
| D-01 | Hybrid, page-anchored: persistent Help page (single source of truth) + replayable overlay tour. |
| D-02 | Entry point: "?" in `#headerActions` beside cloud/gear — header icon is the locked default (sketch 004 re-validated it). |
| D-03 | Workflow-first content model — the treatment loop is the organizing spine; features taught where used. |
| D-04 | Comprehensive coverage, not confusion-triage. Flagship: customizable session sections ("make it yours"); per-session export featured. |
| D-05/D-06 | Technical track: backups & restore, PDF export, per-browser PWA install, offline explainer, 2-device activation/transfer, troubleshooting (PWA TODO folded fully). |
| D-07 | New trial user is the organizing lens; returning user served by replay + browsable page. |
| D-09 | Full-screen branded welcome post-activation; two CTAs (tour / explore myself); re-openable via "?". |
| D-10 | Extend the garden design system; tokens only; dark + RTL safe. |
| D-11 | Tour = hybrid + graceful degradation (anchor → spotlight; missing → modal + "Take me there"; never silent skip). HARD constraint. |
| D-12 | Claude drafts EN, Sapir reviews; DE/CS/HE later. |
| D-13 | Marketing demo untouched; in-app help is an independent system (pattern-borrow only — see §10.3: the pattern source file is now gone). |
| D-14 | Tone benchmark: therapy practice-management (structure) + calm/wellness (voice); NOT generic SaaS tour energy. |
| D-15 | Welcome one-shot via `localStorage sg.welcomeSeen`; "explore myself" OR tour completion sets it; upgraders see it once. |

Also binding: the full **26-UI-SPEC.md contract** (spacing/typography/color/copywriting/interaction
tables) governs the implementation (`ROADMAP.md:53`: "Build phase MUST start from …26-UI-SPEC.md").

---

## 7. Out of scope

- **Rich-text editor migration** → v1.4 (explicitly deferred by Ben; do not scope here).
- **Full DE/CS/HE translation of help + changelog content** → later, after EN stabilizes (D-12
  path). v1.3 ships EN-canonical copy with keys present in all 4 locale files.
- **Marketing/demo changes** — landing page, `demo.html`/`demo.js`, demo seed: untouched (D-13).
  Publishing the demo videos to the landing page is marketing work, not this milestone.
- **Any email/marketing system** (newsletter, consent collection, mail automation) — in-app is the
  chosen channel; no new comms infrastructure.
- **Per-screen distributed "?" panels** — deferred in Phase 26; quick help = deep-links +
  empty-state coaching only.
- **Unifying the marketing demo with in-app help** (shared engine/content) — rejected in P26.
- **License re-validation / phone-home hardening** — separate backlog item, unrelated.
- **"Codebase Health II"** (broader extraction + coverage) — remains backlog; NOT v1.3 despite the
  ROADMAP pencil-in (see header note).

---

## 8. Open questions (for Ben / the roadmap — deliberately NOT answered here)

1. **Help-page IA variant:** sketch 002 A (single-column + sticky rail) / B (two-column stepper) /
   C (accordion + featured card)? All three are built and clickable; `winner: null`.
2. **Tour anchoring:** `data-tour` anchors do NOT exist in production (verified — sketches only).
   The exact anchor list must be drawn against the **current** DOM (post-Phase-28–37 markup).
   Which elements, on which pages, and who owns keeping them stable?
3. **Tour engine source:** `demo-hints.js` — the P26-named rendering-pattern template — was
   **deleted in Phase 35** (commit `36cfd68`). Build fresh from the sketch-003 implementation +
   git history, still bespoke per 26-RESEARCH? (Recommendation stands; confirm.)
4. **Changelog popup trigger:** compare stored last-seen version against
   `window.AppVersion.APP_VERSION` in `localStorage`? How does it interact with the Phase 28
   footer update-nudge (two "new version" signals must not stack confusingly)?
5. **Changelog history depth & backfill:** start at v1.3 only, or backfill v1.2.x (the v1.2.4 seed
   exists) / v1.1? How many releases does the page retain?
6. **Popup dismissal semantics:** dismiss-on-close vs explicit "don't show again"; does opening the
   changelog page from the popup mark it seen?
7. **Per-language changelog copy:** EN-only at first (like help) or 4-language from day one? (The
   v1.2.4 seed is EN+HE; the app UI is 4-language — a mixed-language popup would be jarring.)
8. **Register clash — emojis:** the v1.2.4 changelog seed uses emoji section markers (🗓️🌿🔍💚);
   the 26-UI-SPEC copy contract says "no emojis in any new copy." Which register wins for the
   in-app changelog surface?
9. **Demo videos:** feature-short videos exist and are unposted
   (`TPM_Docs/video-pipeline/out/flow.mp4` + "Final Videos/"). Under the zero-network CSP,
   in-app embedding/linking would violate the offline principle — embed (heavy assets, offline-ok),
   external link (violates zero-network), or landing-page-only (no in-app change)?
10. **Hard-gate mechanism:** git hook vs GSD Definition-of-Done customization vs skill (or a
    combination)? And the checkable **definition of "user-facing change"** the gate keys on.
11. **Gate start-of-life:** does the gate apply retroactively to in-flight work (e.g. Phase 38, if
    it ships after v1.3's gate lands) and to quick tasks, or only to full phases?
12. **i18n timing:** when do DE/CS/HE help + changelog translations land (v1.3.x follow-up,
    v1.4, or opportunistically per Sapir's availability)?
13. **Phase 38 overlap — RESOLVED 2026-07-07:** Phase 38 is code-complete (in UAT) and ships
    inside v1.2. No scope collision, but its feature (next-session date + overview column) IS
    v1.3 help + changelog content — see delta row Δ6 in §11.2.
14. **Coverage edges:** should the "?" / What's-New also reach `report.html` (has `#headerActions`
    but never calls `initCommon()` — needs extra wiring) and `license.html` (no app chrome at
    all)? Or are app pages sufficient?
15. **First-run stacking:** on a fresh activation the user could hit welcome overlay + security
    note + iOS A2HS banner / H-9 install nudge (+ possibly a What's-New) — what is the
    precedence/suppression order? (Suggested instinct: welcome wins first run; What's-New never
    fires on the same launch as first-run welcome; security note defers one launch — but this is
    a design decision to make in discuss-phase, not here.)
16. **Help reachability outside the gated app** (from the folded todo's "linkable from
    post-purchase email"): app pages sit behind the license/terms gates — should the
    help/getting-started content (or a subset: install + activation guidance) be reachable
    pre-activation, e.g. linked from the Lemon Squeezy post-purchase email or the landing page?
    If yes, that changes `help.html`'s gating design; if no, pre-activation users rely on the
    landing page + email support only.

---

## 9. Prior-art index (read before planning)

**Phase 26 design package** (archived; the build contract):
- `.planning/milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-CONTEXT.md` — locked D-01…D-15
- `.../26-UI-SPEC.md` — the approved design contract (spacing/type/color/copy/interaction tables; tour step schema)
- `.../26-RESEARCH.md` — benchmarks (SimplePractice/Jane/Carepatron/Calm), tour-library licensing (AGPL rejections, Driver.js MIT fallback), pitfalls 1–6, content architecture
- `.../26-DISCUSSION-LOG.md` — alternatives considered (audit trail)

**Clickable sketches** (`.planning/sketches/`; open each `index.html`, read each `README.md`):
- `001-welcome-overlay/` — welcome variants A centered-hero / B split / C minimal (`winner: null`)
- `002-help-page-ia/` — Help-page IA variants A/B/C (`winner: null` — open question #1)
- `003-tour-fallback/` — the D-11 anchored↔fallback tour, working "Break anchor" demo; **now also
  the only living implementation of the deleted demo-hints rendering pattern**
- `004-help-entry-point/` — header "?" vs floating button; analysis backs the locked header icon
- `themes/default.css` — sketch theme importing the real production tokens

**Phase 32 seed artifact (the content backbone):**
- `.planning/phases/32-readme-code-comments/32-HELP-CONTENT-INVENTORY.md` — **after v1.2 is
  archived this moves to `.planning/milestones/v1.2-phases/32-readme-code-comments/`** — complete persona-tagged
  (novice/trainer/power/domain), priority-tagged (P1–P3), format-tagged (tour step / FAQ / page
  section) topic tree along the P26 spine, grounded in the live pages — including License & trial
  and Troubleshooting sections P26 never enumerated. Help copy can be written leaf-by-leaf against it.

**Changelog seed:**
- `.claude/context/2026-07-06_changelog-v1.2.4-users.md` — Ben's EN+HE v1.2.4 user-facing
  changelog; the tone/format seed for the in-app changelog.

**Video pipeline (for open question #9):**
- `TPM_Docs/video-pipeline/` — automated Playwright+Remotion+ElevenLabs pipeline; outputs in
  `out/flow.mp4` and `Final Videos/`; feature-shorts made for the 2026-07-03 conference, unposted.

**Folded todos (scope sources — close BOTH when v1.3 ships; see §11.3):**
- `.planning/todos/pending/2026-03-24-pwa-install-guidance-and-user-manual.md` — PWA install
  guidance + user manual (from Phase 19). Absorbed as: technical-track help content, the H-9
  install nudge, and open question #16 (post-purchase-email linkability).
- `.planning/todos/pending/2026-05-15-in-app-onboarding-overview-help.md` — the Phase 26 source
  todo ("launch prerequisite", critical). Design shipped in P26; v1.3 delivers the build. Its
  build breadcrumb pins the two open P26 deliverables v1.3 must produce: the never-authored EN
  content outline and the sketch-winner selection.

**Project state (read-only for this milestone doc):**
- `.planning/PROJECT.md` (note: last updated 2026-06-29 — predates Phases 33–37 completion),
  `.planning/ROADMAP.md` (Phase 26 entry at :53, backlog at :351, superseded v1.3 pencil-in
  at :363, Phase 38 at :469), `.planning/STATE.md` (Phase 38 = current phase, planning).

---

## 10. Reconciliation notes — Phase 26 design vs the 2026-07-06 codebase

Phase 26 predates Phases 28–37. Verified against HEAD (v1.2.4) on 2026-07-06:

### 10.1 What still holds (implement as designed)

- **`#headerActions` (D-02): HOLDS.** Present on all 8 app pages (`index.html:67`,
  `sessions.html:47`, `reporting.html:47`, `add-client.html:47`, `add-session.html:47`,
  `settings.html:47`, `report.html:47`, `demo.html:55`). Icons are mounted by
  `initCommon()` (`app.js:648-654`): theme toggle → language globe → cloud
  (`mountBackupCloudButton`, `app.js:485`) → gear (`initSettingsLink`, `app.js:391-423`, with the
  `.is-active` pattern the "?" must mirror). A "?" mounts cleanly as a sibling `initHelpLink()`.
- **`renderNav()` (D-01): HOLDS**, now at `app.js:137-156` (a divider was added). Entries today:
  Overview / Sessions / Reporting / [divider] / Add Client / Add Session — no Help entry; the bar
  is getting full (consider where Help lands visually).
- **Welcome gating pattern (D-15): HOLDS as plan.** `sg.welcomeSeen` does not exist yet (correct —
  net-new). The `showFirstLaunchSecurityNote()` precedent it was modeled on is still live at
  `app.js:1212`.
- **Design system, i18n, RTL plumbing: HOLD.** `tokens.css`, `data-i18n` + 4-locale parity
  (DE/CS completed by Phase 33), `app:language` event, `[data-theme]` dark mode, logical
  properties — all as the UI-SPEC assumes.
- **Offline posture: HOLDS** (CSP header, only `api.lemonsqueezy.com` external; SW precache).

### 10.2 What changed — terminology (affects ALL P26-era content outlines)

- **"Heart Shield" → "Heart-Wall"** (Phase 37-11; value-only rename, i18n keys fenced — keys still
  say `heartShield`, displayed values say "Heart-Wall" / חומת הלב in all 4 languages).
- **"Session Type" → "Session Format"** (Phase 37-11), now a two-tier model: 5 locked defaults
  (in-person/online/remote/proxy/other) + user-defined custom formats
  (`assets/settings-session-types.js`).
- The P26 content outline, the 26-UI-SPEC copy table, and the Phase 32 topic tree (authored
  2026-06-29, pre-rename) **all use the old terms** — every help/tour/changelog string must use
  the current display terminology.

### 10.3 What is gone — the tour-engine template (biggest single delta)

- **`assets/demo-hints.js` was DELETED** in Phase 35 (commit `36cfd68`, "remove dead
  demo-hints.js"). The 26-UI-SPEC names it repeatedly as the rendering-pattern template for the
  bespoke tour engine. The iframe gate, the HINTS map — all gone; `demo.html` now loads
  `assets/demo.js` (Phase 35 refresh).
- **Impact:** the tour engine is authored fresh. The surviving pattern sources are git history and
  the working sketch `003-tour-fallback/index.html` (which implements spotlight, tethered tooltip,
  fallback modal, RTL flip, language re-render). The bespoke-over-vendored recommendation in
  26-RESEARCH still stands on its own arguments (zero-dep constraint; the RTL/dark token CSS layer
  is hand-authored either way).
- **`data-tour` anchors: none exist in production** (sketch only). The full anchor list is
  net-new instrumentation and must be enumerated against the *current* markup — the Phase 28–37
  refactors (god-module extraction, header/nav tweaks, Phase 37 filter/settings additions) mean
  the P26-era DOM references cannot be trusted; re-derive from HEAD.

### 10.4 What changed — version/update mechanics (feeds Pillar 2 + 3)

- Since Phase 28 there is a **single version source**: hand-set `APP_VERSION = '1.2.4'`
  (`assets/version.js:25`) + deploy-stamped `INTEGRITY_TOKEN` (git SHA, `deploy.yml`); the footer
  renders it (`shared-chrome.js:135`) with an integrity self-check + update nudge; SW `CACHE_NAME`
  auto-derives (`sw.js:26`); `version.js`/`sw.js` are no-cache.
- The **pre-commit CACHE_NAME bump hook the P26 docs mention no longer exists** (no active git
  hooks at all). `PRECACHE_URLS` additions for `help.html` etc. are a manual edit.
- **No changelog scaffolding of any kind exists** — no UI, no data file, no i18n keys. Pillar 2 is
  fully greenfield; the popup's version comparison should key on `APP_VERSION` (localStorage
  last-seen), NOT on the SW/token layer, and must coexist with the existing footer nudge (open
  question #4).

### 10.5 What P26 didn't know — first-run surface collisions

- Three `<head>` redirect gates on `index.html` (license → terms → license-complete) run before
  anything renders; the welcome can only fire after them.
- `showFirstLaunchSecurityNote()` (`app.js:1212`, 7-day recurring, `securityGuidanceDismissed`)
  and the iOS add-to-home-screen banner (`index.html:362-374`, per-session) already occupy
  first-run attention. Adding welcome + What's-New requires an explicit precedence order (open
  question #15).
- `report.html` has `#headerActions` markup but never calls `initCommon()` → no "?" there without
  extra wiring; legal/marketing/license pages have no app chrome (open question #14).

### 10.6 Feature-set growth since P26 (help content must cover the CURRENT app)

Verified present at HEAD and absent from the P26 outline: Session Formats incl. custom formats +
filters + Heart-Wall toggle + overview column sorting (Phase 37), date-format personalization
(Settings → Personalize, Phase 37), crash log + "Report a problem" screen (`report.html`, Phase
29), version-integrity footer + update nudge (Phase 28), redesigned PDF export (Phase 34),
refreshed demo (Phase 35). Also verified: "emotions quick-paste" **is** the Snippets text-expansion
engine on the emotions textareas (`data-snippets="true"`; there is no separate picker widget) —
spine step 3 copy must describe snippets/trigger-prefix behavior, not an imaginary paste button.
There is no CSV export (export = per-session PDF/Markdown/Share, full ZIP backup, snippets JSON).
The Phase 32 topic tree already covers most of this; extend it only for the Phase 37 additions
(session formats, date format, new filters/sort) which post-date it.

### 10.7 Milestone bookkeeping

- **v1.2 is still live**: Phase 38 ("Next session date field with overview column") is
  **code-complete as of 2026-07-07** (executed, code-reviewed — WR-01 fixed; in UAT). What it
  shipped, for help/changelog purposes: optional next-session date input in the
  "information for the next session" section (section shows on note OR date), a "Next Session"
  overview column with an overdue visual cue and ascending sort with blanks-to-bottom, the date
  included in session exports, and self-freshening demo dates. Phase 37 verification awaits
  Sapir's translation review. v1.3 must be created via `/gsd-new-milestone` only AFTER v1.2
  completes — this document is the prepared scope input for that run.
- **ROADMAP.md:363** pencils in v1.3 as "Codebase Health II"; Ben's 2026-07-06 decision supersedes
  it (see header). The extraction/coverage work stays in the backlog.

---

## 11. Discuss-phase / plan-phase quick reference (added 2026-07-07, pre-milestone-start)

GSD distillation (context → requirements → roadmap → per-phase plans) tends to drop specifics.
This section is the survival kit: pull these into discuss-phase and plan-phase **verbatim**.

### 11.1 Six facts every v1.3 phase plan must honor

1. **`26-UI-SPEC.md` is the binding design contract** (`ROADMAP.md:53`: "Build phase MUST start
   from" it). It already contains the tour-step schema, the "?" interaction contract, the welcome
   contract, spacing/typography/color tables, and draft EN copy with i18n keys — do not re-derive.
2. **The tour engine is a fresh build.** Its named template (`demo-hints.js`) was deleted in
   Phase 35; `data-tour` anchors exist nowhere in production. Reference implementation =
   `.planning/sketches/003-tour-fallback/index.html` (spotlight, fallback modal, RTL, language
   re-render — all working). Anchor list must be enumerated against **HEAD**, not P26-era DOM.
3. **Current display terminology**: **Heart-Wall** (not "Heart Shield" — i18n *keys* still say
   `heartShield`, values don't), **Session Format** (not "Session Type"). All P26-era outlines and
   the Phase 32 inventory pre-date this rename.
4. **Surface rules**: `tokens.css` semantic vars only, logical properties only, `[data-theme]`
   dark-aware, `data-i18n` keys present in all 4 locale files EN-first, Hebrew noun/infinitive
   headings, no emojis in UI copy (changelog register = open question #8).
5. **Plumbing**: zero network; `help.html` + new assets manually added to `sw.js`
   `PRECACHE_URLS`; What's-New trigger keys on `window.AppVersion.APP_VERSION`
   (`assets/version.js:25`), NOT the SW/integrity-token layer; "?" mounts as an `initHelpLink()`
   sibling of `initSettingsLink()` (`app.js:391-423`) inside `initCommon()`.
6. **The help COPY does not exist yet.** Phase 26's EN content outline (a D-08 deliverable) was
   never authored — writing it is v1.3 work, drafted leaf-by-leaf against the Phase 32 topic
   tree + §11.2 delta, using the 26-UI-SPEC copywriting contract (tone, i18n keys, noun-form
   headings), then Sapir-reviewed (D-12). Plan content authoring + review as its own workstream,
   not a byproduct of UI implementation.

The 15 open questions in §8 are the **discuss-phase agenda** — none are answered elsewhere in
this doc; do not let a planner invent answers to them.

### 11.2 Help-topic list = the Phase 32 inventory + this delta

**Canonical topic tree:** `32-HELP-CONTENT-INVENTORY.md` (Phase 32 dir; see §9 for the
post-archival path). ~40 leaves, each tagged persona (novice/trainer/power/domain) · P26-status ·
format (tour step / FAQ / page section) · priority (P1–P3), organized along the 7-step spine +
flagship personalization + technical track + license/trial + troubleshooting. **Do NOT rebuild
it — write help copy leaf-by-leaf against it.** Apply this delta on top (features that post-date
the inventory, 2026-06-29):

| Δ | New topic (title + intent) | Shipped | Suggested placement / tags |
|---|---------------------------|---------|----------------------------|
| Δ1 | **Session Formats, your way** — rename the 5 built-in formats (In-person/Online/Remote/Proxy/Other) or add your own; where they appear (logging, filters) | P37 (`settings-session-types.js`) | Flagship personalization · page section · **P1** |
| Δ2 | **Choosing your date format** — Settings → Personalize; Auto follows language; applies everywhere incl. PDF | P37 (`date-format.js`) | Flagship personalization · page section · **P2** |
| Δ3 | **Filtering by Session Format** — multi-select filter on Overview + Sessions pages | P37 | Spine §7 (overview) · page section · **P2** |
| Δ4 | **The Heart-Wall toggle** — one switch to see only Heart-Wall clients/sessions | P37 | Spine §7 · FAQ · **P2** |
| Δ5 | **Sorting the overview** — click Name / Sessions / Last Session column headers; click again to flip | P37 | Spine §7 · FAQ · **P2** |
| Δ6 | **Planning the next session** — optional next-session date + note; "Next Session" overview column, overdue cue, blanks-to-bottom sort; included in exports | P38 | Spine §6 (finish) · page section · **P2** |
| Δ7 | **How updates reach you** — footer version, automatic update on deploy, the What's-New popup (v1.3 itself) | P28 + v1.3 | Technical track · FAQ · **P2** — candidate, confirm in discuss-phase |
| Δc | **Corrections across the whole tree**: Heart Shield→Heart-Wall, Session Type→Session Format; spine step 3 ("capture emotions") must describe the real mechanism — Snippets text-expansion with a trigger prefix on the emotions textareas — not a paste button | — | applies to existing leaves |

**Changelog content at v1.3 launch** (feeds open question #5): candidates are v1.3's own release
notes (mandatory, C-4), the v1.2.4 seed (exists, EN+HE), and a v1.2.x entry for Phase 38's
next-session feature — backfill depth is Ben's call in discuss-phase.

### 11.3 Folded-todo bookkeeping (close BOTH at v1.3 ship)

| Pending todo | Age | What v1.3 absorbs |
|--------------|-----|-------------------|
| `2026-03-24-pwa-install-guidance-and-user-manual.md` | ~105d | User manual / getting-started → help-center technical track (install per browser, offline explainer, backups & why, 2-activation limit, deactivate/transfer, troubleshooting). In-app install prompt → **H-9**. "Linkable from post-purchase email" → **open question #16**. Activation copy must use correct browser/endpoint terminology (same sensitivity as pending todo `device-browser-terminology-fix`). |
| `2026-05-15-in-app-onboarding-overview-help.md` | ~53d | The Phase 26 source todo (critical, "launch prerequisite"). Research/design/mockup shipped in P26 (patterns a–f evaluated; D-01…D-15). v1.3 delivers the deferred build + the two deliverables its build breadcrumb marks open: the **EN content outline** (never authored — fact #6 above) and the **sketch-winner selection** (open question #1). |

Both todos move to done/archived when v1.3 ships; neither should survive the milestone.

### 11.4 Sequencing consideration for the roadmapper (non-binding — Ben decides)

Pillar 3 (docs hard-gate) interacts with v1.3's own phases: land it **first** and the help/
changelog phases dogfood the gate (but the gate must then handle "help doesn't exist yet");
land it **last** and it never gets validated on a live phase inside the milestone. A middle path
(gate scaffolding early, enforcement switched hard at v1.3 close) is a candidate — flag it in
discuss-phase, do not pre-decide.

---

*Prepared 2026-07-06 by Claude (Fable) from: Phase 26 package + sketches 001–004, Phase 32
help-content inventory, v1.2.4 changelog seed, PROJECT/ROADMAP/STATE, and a full code
reconciliation against HEAD (v1.2.4). Added 2026-07-07: §11 quick reference, Phase 38
code-complete status, and full absorption of the two pending todos
(2026-03-24 PWA-install/user-manual → H-9 + OQ #16; 2026-05-15 help-system source todo →
never-authored EN content outline surfaced as fact #6). Not committed; for Ben's review.*
