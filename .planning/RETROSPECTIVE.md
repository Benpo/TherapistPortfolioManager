# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2 — Codebase Health & Reliability

**Shipped:** 2026-07-07
**Phases:** 11 | **Plans:** 82 | **Timeline:** 15 days (2026-06-22 → 2026-07-07) | **Commits:** 550

### What Was Built
- Reliable PWA update delivery (field-verified on real installed Safari) + a runtime integrity self-check that can no longer silently lie about the running version
- Zero-network crash logging, a "Report a problem" flow, and an IndexedDB migration reset-and-recover escape hatch
- The project's first automated test suite (`package.json` + `npm test`, 131 tests) built as a pre-refactor safety net
- Two god modules (`settings.js`, `add-session.js`) decomposed into cohesive IIFE modules behind that green suite
- An in-repo maintainer README + four-slot code-comment banners on ~27 modules (pilot + batch-2)
- DE/CS i18n completion, a brand-redesigned client PDF export, a demo-app refresh to version parity, a canonical local-time date engine, a Personalization settings tab, and an optional next-session-date field with overview column

### What Worked
- **Dependency-ordered phasing** (tests → refactor → docs, not stated-priority order) meant the god-module refactor (P31) always had a green characterization suite to catch regressions, and never broke behavior silently.
- **Behavior tests that execute real modules**, not source-slicing string matches — established in P30 and enforced by a fake-test-detector gate — repeatedly caught real regressions in later phases (e.g. the P31 CR-01 use-after-close bug) instead of rubber-stamping refactors.
- **Design-locked phases before planning** (P34 PDF redesign, P37 personalization surface) kept execution fast because visual/UX ambiguity was resolved up front, not mid-implementation.
- **On-device Safari verification** for RTL/bidi and native-date-input behavior caught real defects (P38 UAT tests 5-8) that jsdom/headless-Chrome testing structurally cannot see — WebKit-specific `::-webkit-datetime-edit` and bidi rendering bugs only surface on a real engine.

### What Was Inefficient
- **False-green test infrastructure surfaced twice** — the PDF jsdom harness silently exited 0/0-bytes for months (`loadScriptOnce` never resolving under jsdom) before being caught during P34, and a similar pattern was flagged as a standing risk (`reference-pdf-jsdom-inert-gates`). Any inert-gate risk in a harness needs an explicit "does this gate ever fail" smoke-check, not just "does it pass."
- **Behavior-preserving extractions broke tests coupled to internal structure** (count/index assumptions, runtime-load assumptions) during P31 — a green suite alone didn't guarantee a safe refactor; per-mechanism grep gates were needed on top.
- **Worktree isolation for `/gsd-execute-phase` orphaned executor commits** at least once (Phase 33) when run concurrently with another session on a stale base — sequential-on-main execution proved more reliable for this single-repo, single-owner project than parallel worktree isolation.
- **UAT rounds ran twice on Phase 38** (initial UAT + a retest surfacing 4 more gaps) — RTL/bidi and native-date-input edge cases were under-scoped in the original plan and only found via a second real-device pass.

### Patterns Established
- **Four-slot banner comment convention** (what it owns · public `window.*` surface · cross-`window.*` dependencies · key invariants) with a comments-only strip-and-compare gate — now the standing convention for any future comment work (e.g. batch-3 on the 3 remaining giants).
- **Dev-only npm dependencies never compromise the zero-runtime-dep production bundle** — Cloudflare ships static `/assets/*`, never `node_modules`, so test tooling (jsdom) can use npm freely without touching the product's zero-dependency guarantee.
- **Headless-Chrome self-measuring screenshots** as a lightweight alternative to full Playwright for one-off visual verification, with an awareness of Chrome's ~500px minimum-viewport quirk.
- **A pattern-mapper "already does X, zero new code needed" reuse claim is a hypothesis, not a fact** — it must be verified against real source before a plan relies on it; a false reuse premise passes completeness checks but ships silent defects (surfaced in the P37 backup blocker).

### Key Lessons
1. Any test harness with an inert-but-passing failure mode (jsdom stubbing, headless-only checks) needs a periodic "does it ever go RED" audit — false confidence compounds silently across phases.
2. RTL/bidi and native-input-widget correctness cannot be fully verified without a real WebKit/Safari pass — budget for on-device verification explicitly in any phase touching those surfaces, not as an afterthought.
3. Terminology/labeling collisions (like "Session Type" meaning three different things) are cheap to fix early and expensive once they've spread across i18n keys, DOM classes, and UAT scripts — a naming audit before large UI work pays for itself.
4. Scope additions mid-milestone (P34–P38 tail) are healthy when each is a real surfaced need with its own goal/success-criteria, not scope creep — the dependency-ordered core (P28–P33) still shipped and closed cleanly underneath the tail.

### Cost Observations
- Sessions: many across a 15-day window, dominated by weekday work with several same-day phase closures (P28, P34, P35 each closed same-day as started)
- Notable: the test-harness investment in P30 (13 plans) paid for itself across P31–P38 — every subsequent phase's plan-checker gate could rely on "suite green" as a real signal, not a hopeful one

---

## Milestone: v1.3 — In-App Help, Onboarding & Changelog

**Shipped:** 2026-07-10  
**Phases:** 6 (39, 40, 41, 42, 42.1, 43) | **Plans:** 59 | **Tasks:** 32

### What Was Built
An in-app self-teaching + release-comms layer: persistent "?" entry + offline help center (P39); a single-surface first-run onboarding coordinator + welcome overlay (P40); a bespoke replayable 12-step guided tour with graceful spotlight↔modal degradation and cross-page resume (P41); a once-per-version What's-New popup + persistent changelog (P42); full HE/DE/CS localization of all new copy (P42.1); and a layered docs-maintenance hard gate — git hook + unbypassable CI step + GSD DoD — that blocks any user-facing change lacking a changelog/help update (P43).

### What Worked
- Dependency-ordered sequencing (help center first, docs gate last) meant the gate never blocked its own milestone's sibling commits.
- The AttentionCoordinator's single-surface precedence registry solved first-run collisions (welcome vs What's-New vs tour vs install nudge) at one seam.
- Independent/adversarial verification caught real defects late: the tour's cross-page resume was silently broken in production (CF Pages clean-URL 308 vs `.html` page identity) and only surfaced via a live-host repro, not the jsdom suite.
- Pulling L10N into the same milestone (P42.1, moved in from a v2 deferral) kept the Hebrew-first user base first-class from day one.

### What Was Inefficient
- The tour (P41) was the fragility hotspot: held at UAT with 8 gaps, two gap-closure rounds (41-13/14), then still shipped a production-only clean-URL resume bug — remediated post-ship as the 260710-tcu hotfix. A live-host (not just jsdom) gate would have caught it pre-ship.
- Go-live hit a deploy purge-race (CF cache purged before Pages promotion → stale/mixed edge), which recurred on the hotfix deploy too. Still-open HIGH todo; every deploy is exposed until fixed.
- Phase 41 shipped without a formal VERIFICATION.md and Phase 43 without nyquist bookkeeping — closed as accepted tech debt.

### Patterns Established
- **Clean-URL page identity**: host clean-URL rewrites (CF Pages 308 `.html`→extensionless) break any code identifying pages by `.html` filename; canonicalize at one seam and regression-test with a stubbed clean URL. Deeper fix (a `data-page` attribute) is backlogged.
- **Docs-as-DoD hard gate**: a path-based "user-facing" definition + changelog-only/denylist tiers + tip-only trailers, enforced authoritatively in CI, keeps docs from rotting.
- **Deploy babysitting**: after every deploy, byte-sweep live vs repo and `gh run rerun` if the edge is stale (purge race).

### Key Lessons
- Verify runtime-behavior features on the REAL production host, not only jsdom/CI — the clean-URL bug was invisible to 168 green tests.
- A green suite that only ever exercises one code path (`.html` URLs) has a structural blind spot; add the falsifying input (clean URL) as a permanent guard.
- Every push to main auto-deploys and rolls the integrity token — avoid docs-only pushes (needless PWA churn + re-exposed purge race).

### Cost Observations
- Model mix: predominantly opus (planning/execution/verification), sonnet for integration/checker passes.
- Notable: the milestone's single worst defect (tour resume) cost a post-ship hotfix a live-host test gate would have prevented — the strongest process signal for v1.4.

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 | 9 | Initial MVP build; vanilla JS + IndexedDB architecture established |
| v1.1 | 20 | Feature depth + launch prep; first UAT-driven gap-closure rounds |
| v1.2 | 11 | First automated test suite + dependency-ordered phasing (tests before refactor); maintainer-reframe (Ben + AI agents, not Sapir) |

### Cumulative Quality

| Milestone | Tests | Notable |
|-----------|-------|---------|
| v1.0 | 0 | No automated tests — manual QA only |
| v1.1 | ~34 (ad hoc, no runner) | Tests existed but no single documented command to run them |
| v1.2 | 131 (`npm test`, single command) | First `package.json`; fake-test-detector gate; behavior tests execute real modules |

### Top Lessons (Verified Across Milestones)

1. On-device real-browser verification (Safari for RTL/bidi/PWA, not just jsdom/headless-Chrome) has caught real defects in both v1.1 (Phase 23 PDF Hebrew rewrite) and v1.2 (Phase 38 UAT retest) — this is a recurring, not one-off, need for this app's Hebrew RTL + PWA surfaces.
2. Design-lock-before-plan (UI-SPEC approved before `/gsd-plan-phase`) consistently produces faster, lower-friction execution than resolving visual ambiguity mid-implementation.
</content>
