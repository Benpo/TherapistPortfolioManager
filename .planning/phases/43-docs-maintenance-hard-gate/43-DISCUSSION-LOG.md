# Phase 43: Docs-Maintenance Hard Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 43-docs-maintenance-hard-gate
**Areas discussed:** Trigger point & noise budget, "User-facing change" definition, What satisfies the gate, Escape hatch & layer wiring

Ben selected all four offered gray areas.

---

## Trigger point & noise budget

### Which git moment fires the local hook?

| Option | Description | Selected |
|--------|-------------|----------|
| pre-push only | One check per push over the full commit range; mirrors CI exactly; doesn't interrupt gsd-executor's atomic-commit rhythm | ✓ |
| pre-commit only | Immediate feedback; roadmap's literal "fast local git hook"; but fires on every atomic commit mid-phase | |
| Both, different strictness | pre-commit warns, pre-push blocks; two scripts to keep in sync | |

**User's choice:** pre-push only
**Notes:** The deciding argument was that `gsd-executor` makes one atomic commit per task (5–15 per phase) with no human present. A pre-commit gate would block task 1 of 8 and force a blanket waiver — normalizing the `--no-verify` culture GATE-03 exists to prevent. → **D-01**

### Evaluation unit & branch scope

| Option | Description | Selected |
|--------|-------------|----------|
| Push range, main only | `origin/main..HEAD` locally, `before..after` in CI; a push judged as a whole; other branches skip the hook | ✓ |
| Push range, every branch | Future-proofs the pre-prod branch; but throwaway/spike branches gain friction that buys nothing | |
| Per commit, in the range | Maximally strict; incompatible with atomic commits — would force every task commit to edit the changelog | |

**User's choice:** Push range, main only
**Notes:** Open infra todo (commit `d037b17`) will add a pre-prod branch; gating it was deliberately deferred rather than pre-emptively included. → **D-02, D-03**

### Fail mode when the gate script itself errors

| Option | Description | Selected |
|--------|-------------|----------|
| Fail closed everywhere | Any error = blocked, in both hook and CI. "A gate that passes when it's broken isn't a gate." | ✓ |
| Fail closed in CI, fail open locally | Two behaviors from one script; you'd stop trusting the local signal | |
| Fail closed, with documented baseline fallback | Handle the all-zeros before-SHA case explicitly; more code, fewer 3am surprises | |

**User's choice:** Fail closed everywhere
**Notes:** The baseline-fallback concern from option 3 was preserved as a planner note inside D-04 rather than lost — the all-zeros SHA is a known-benign case that should be handled, not merely failed on. → **D-04**

---

## "User-facing change" definition

### The path rule

| Option | Description | Selected |
|--------|-------------|----------|
| Broad + explicit denylist | Everything deploy.yml ships counts; a short written denylist carves out what isn't user-feelable; fails safe | ✓ |
| Narrow — only paths in covers[] | Very quiet, zero false positives; but `add-session.js`, `app.js`, `tour.js` would sail through unchecked | |
| Allowlist — hand-curated | Total control; fails open — every future file is invisible until someone remembers | |

**User's choice:** Broad + explicit denylist
**Notes:** Scouting established that the 22 paths named in `covers[]` are not a complete list of shipped app code — the app's largest user-facing files are claimed by zero topics. → **D-05**

### The denylist contents

| Option | Description | Selected |
|--------|-------------|----------|
| Vendor bundles (jspdf/jszip/bidi) | Pinned third-party libs; but a jsPDF upgrade changes real PDF output users see | |
| Legal + marketing pages (impressum/datenschutz/disclaimer ×4, landing.html, demo.html) | Change for legal/marketing reasons, not product reasons; no help topic covers them | ✓ |
| Translation + content data files | Would prevent circularity; but see follow-up below | |
| Nothing — keep all in scope | Maximum strictness; you'd write trailers constantly and route around the gate | |

**User's choice:** Legal + marketing pages only
**Notes:** Vendor bundles deliberately stay **in scope** — a jsPDF upgrade is among the most user-visible changes possible and the easiest to forget to mention. → **D-06**

### Follow-up: the circularity problem

Keeping `help-content-*.js` and `changelog-content-*.js` in scope means editing help to satisfy the gate would trip the gate. Resolved by a **role rule**, not a denylist entry.

| Option | Description | Selected |
|--------|-------------|----------|
| Satisfiers, never triggers | Those files are how you *pass* the gate, so they can't also be things it demands docs for | ✓ |
| Same, plus carve out the JS siblings of denylisted pages | Coherence fix: landing.html denylisted but landing.js gated is incoherent | |
| Let Claude decide the exact role table | Principle set; concrete mapping written into the gate script for review | |

**User's choice:** Satisfiers, never triggers
**Notes:** Ben subsequently clarified that the JS siblings (`landing.js`, `demo.js`, `demo-seed.js`, `disclaimer.js`, `i18n-disclaimer.js`) **must also be excluded** — his intent had been the second option. Both rules are captured. → **D-06, D-07**

---

## What satisfies the gate

**Ben's mid-discussion directive** (reproduced in CONTEXT.md `<specifics>`) reshaped this area substantially:

> *"We have to keep both the changelog as well as the help section up to date. And we need to make sure that the agent checking it does not really go through all of the help section, but rather that we make an extract which is always up to date… I don't even think we need to go over what already is in the help section. In order to see if something has changed, we need to decide this based on the scope of the phase we are trying to commit and push. And based on that one we are deciding together if it's relevant for the users. My concern is when we already decided that it needs to be added to the help or updated within the help section — how do we make it the most efficient to double-check where does it exist in the help section?"*

This established **D-10** (the gate never semantically diffs help content; it forces a human/agent decision and records it) and reframed the extract question below. The gate is a forcing function, not an inference engine.

### The extract

| Option | Description | Selected |
|--------|-------------|----------|
| Gate prints the slice + committed HELP-MAP.md | Failure message names the exact topics claiming each changed file; plus a generated, freshness-checked map readable cold at plan time | ✓ |
| Gate failure message only — no artifact | Zero drift risk, nothing to keep fresh; but no map to consult while planning | |
| Committed HELP-MAP.md only | One standing artifact; but a blocked gate makes you go look topics up yourself | |

**User's choice:** Gate prints the slice + committed HELP-MAP.md (chosen after a plain-language re-explanation — Ben asked for the jargon to be dropped)
**Notes:** Emphasised in the explanation and preserved as a hard constraint: **in none of these does anything read the full help corpus.** Only `covers[]` metadata is parsed; the four locale bodies are never touched by the gate. → **D-13**

### The changelog half

| Option | Description | Selected |
|--------|-------------|----------|
| Touch the in-progress entry + a release-moment check | Ordinary push edits changelog-content-en.js or carries a trailer; release push requires an entry matching APP_VERSION with highlights + date. No schema change | ✓ |
| Add an "Unreleased" entry convention | Conceptually cleanest; but schema change + page/popup render suppression + 4-locale integrity-test churn | |
| Release moment only | Quietest; but you write the whole release's changelog from memory at the end — the exact habit this phase kills | |

**User's choice:** Touch the in-progress entry + a release-moment check
**Notes:** The v1.3.0 entry already exists in `changelog-content-en.js`; the next milestone opens its entry early. → **D-08, D-09**

### Uncovered changed files

| Option | Description | Selected |
|--------|-------------|----------|
| Block — add covers[] or declare unaffected | The anti-rot engine: over time the gate teaches the corpus to grow coverage | ✓ |
| Pass — uncovered means help has nothing to say | Quiet; but the app's five biggest files stay permanently exempt | |
| Block for new files only | Freezes today's debt; needs a snapshot artifact to keep honest | |

**User's choice:** Block — add covers[] or declare unaffected
**Notes:** Accepted cost: until a file earns a topic, touching it needs one trailer line. → **D-12**

### The declaration mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Commit trailer | `Docs-Gate: help-unaffected (<file> — reason)`; welded to the commit it justifies; hook and CI read the identical thing | ✓ |
| A reviewable waiver ledger file | Skimmable running record; but a row can say "n/a" and pass, and it drifts from what shipped | |
| Both — trailer as mechanism, ledger generated from it | Most auditable; another generated artifact needing its own freshness check | |

**User's choice:** Commit trailer (chosen after a plain-language re-explanation — Ben asked for the difference in simpler terms; the "receipt vs notebook" framing settled it)
**Notes:** The generated ledger was preserved as a deferred read-only view — cheap to add once trailers exist. → **D-14**

---

## Escape hatch & layer wiring

### The emergency escape hatch (GATE-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Loud trailer, honored by CI | `Docs-Gate: emergency-skip (reason)`; CI prints a large banner; a script lists every skip in history | ✓ |
| GitHub manual re-run with an override input | Real friction; but at 3am on a phone that's a bad time to discover the UI flow | |
| Both — trailer for CI, --no-verify for the hook | Two hatches, one of which leaves no trace — exactly the culture GATE-03 names | |

**User's choice:** Loud trailer, honored by CI
**Notes:** Reasoning accepted: on a solo repo self-approval is honest, so make the hatch **visible** rather than hard. → **D-14**

### Hook installation

| Option | Description | Selected |
|--------|-------------|----------|
| npm prepare script auto-installs it | `"prepare": "git config core.hooksPath .githooks"`; runs on npm install, which anyone running the tests already does | ✓ |
| scripts/install-hooks.sh, documented in CLAUDE.md | Explicit; but a step someone must remember, and a cloud agent on a fresh clone won't | |
| Skip the local hook entirely — CI is the gate | Honest about where enforcement lives; contradicts GATE-02's explicit requirement | |

**User's choice:** npm prepare script auto-installs it
**Notes:** Surfaced during scouting: `core.hooksPath` is currently pinned to `.git/hooks`, so a committed `.githooks/` would be inert. Separately, `.claude/hooks/pre-commit` is a tracked but dead hook (obsolete sw.js CACHE_NAME auto-bump) — deletion agreed without objection. → **D-15, D-16**

### The GSD definition-of-done layer

| Option | Description | Selected |
|--------|-------------|----------|
| Invariants test + written DoD | `tests/43-docs-gate.test.js` joins npm test via auto-discovery, so gsd-verifier catches drift on every phase; plus a DoD line in CLAUDE.md | ✓ |
| A GSD loop hook at ship:pre | Native to the workflow; but only fires with /gsd-ship, lives in GSD config not the repo | |
| Both | Belt, braces, and a second pair of braces | |

**User's choice:** Invariants test + written DoD (chosen after a plain-language re-explanation — Ben asked the question to be explained better)
**Notes:** The key distinction explained: the gate's push-range rule needs a git diff and cannot run inside `npm test`; its *invariants* (HELP-MAP freshness, dangling `covers[]` paths, changelog schema, denylist/satisfier coherence) need nothing but files on disk. → **D-17**

### GATE-04 validation

| Option | Description | Selected |
|--------|-------------|----------|
| Automated RED/GREEN behavior test + the live v1.3 push | Temp git repo, real gate script, assert non-zero exit then pass. Written before the gate exists | ✓ |
| Manual rehearsal recorded in phase UAT | Real observed proof; guards nothing afterward | |
| The live v1.3 push passing is enough | A gate that always passes also ships green | |

**User's choice:** Automated RED/GREEN behavior test + the live v1.3 push
**Notes:** Honors the standing project rule that runtime-behavior code requires falsifiable behavior tests before implementation. → **D-21**

---

## Ben-initiated: the covers[] backfill

Not an offered gray area — Ben raised it: *"I think `covers()` should be updated as the sessions must be in the help section."*

Diagnostic finding: `topic-new-session` covers `sessions.html` and `add-session.html` but not `assets/sessions.js` / `assets/add-session.js`. The session files were never *undocumented* — the index simply named the pages and not the scripts behind them.

### Backfill scope

| Option | Description | Selected |
|--------|-------------|----------|
| Metadata only — extend existing topics' covers[] | Add each covered page's scripts + obvious module owners; no new prose, no translation work | ✓ |
| Backfill + write the missing help topics | Closes the hole properly; but new prose × 4 locales + native-speaker gates riding on a tooling phase | |
| Backfill + record the residual as tracked debt | Debt visible and reviewable; a second artifact to keep honest | |

**User's choice:** Metadata only
**Notes:** New topics for `reporting.html`, `tour.js`, `whats-new.js` deferred. → **D-19**

### covers[] locale duplication

Scouting found `covers[]` duplicated in all four help files (34 entries each) — repo metadata living inside translated content.

| Option | Description | Selected |
|--------|-------------|----------|
| EN canonical; gate reads only EN | Matches Phase 42 D-17; backfill still mirrors ×4 to keep parity tests green | |
| EN canonical, and strip covers[] from the translations | Removes the duplication at its root; backfill touches one file; 42.1 parity tests need adjusting | ✓ |
| Let Claude decide after reading the 42.1 integrity tests | Pick the cheaper coherent option and document it | |

**User's choice:** Strip covers[] from the translations
**Notes:** Ben, verbatim: *"I will let you decide here, but I don't want to save up on better design — from my perspective the entire help is always 4 languages also going forward, so I see no reason why we need this translated — so better to fix this now than in the future."* → **D-20**

---

## Scope check: npm test in CI

Surfaced during scouting: `deploy.yml` runs **no tests at all**. The docs gate will be the first `node` step in CI.

| Option | Description | Selected |
|--------|-------------|----------|
| Gate step only — note the rest as a deferred idea | Stays inside the phase boundary; GATE-02 asks for a docs-gate step, not a test-suite step | ✓ |
| Add npm test to CI alongside the gate | Would make the invariants layer genuinely unbypassable; a second capability with its own failure modes | |
| Gate step + run only the gate's own invariants test | Narrow and fast; no dependency on the other 166 tests | |

**User's choice:** Gate step only
**Notes:** Consequence stated plainly and accepted: the D-17 invariants test runs via `npm test` locally and through `gsd-verifier`, **not** in CI. The push-range rule is unbypassable; the invariants are not. → **D-18**

---

## Claude's Discretion

- The concrete file→role mapping (denylist / satisfier / trigger) written into the gate script's documented definition.
- Gate script language and location — plain `node` vs `bash`; likely `scripts/docs-gate.js` + a thin `.githooks/pre-push` shim so hook and CI share one implementation (GATE-02's "shared script").
- `HELP-MAP.md` location and exact table shape; the generator's home.
- The merge-base fallback for an all-zeros baseline SHA (D-04).
- Trailer parsing rules — case sensitivity, multiple trailers per push, which commit in the range they may live in.
- Wording of the `CLAUDE.md` DoD line and of the written "user-facing change" definition.

## Deferred Ideas

- **New help topics for uncovered user surfaces** — `reporting.html`/`reporting.js` (a whole page with no topic), `tour.js`, `whats-new.js`. Phase-39-sized content effort; not a tooling phase.
- **Adding `npm test` to CI** — would make the invariants layer unbypassable; its own infra decision.
- **Gating the pre-prod branch** — pending the open infra todo (commit `d037b17`).
- **A generated waiver ledger** — a read-only table reconstructed from `Docs-Gate:` trailers in git history. Rejected as a mechanism, attractive later as a view.
- **A committed coverage-debt list** — middle path for D-12; revisit only if trailer volume becomes annoying.
</content>
