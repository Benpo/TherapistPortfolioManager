---
phase: 43-docs-maintenance-hard-gate
plan: 01
subsystem: testing
tags: [docs-gate, git-trailers, red-first, throwaway-repo, role-table, node-vm]

# Dependency graph
requires:
  - phase: 42-changelog
    provides: changelog-content-en.js schema (version/highlights/origin) the release-moment case models
  - phase: 39-help
    provides: help-content-en.js covers[] reverse-index shape the help/uncovered cases model
provides:
  - "tests/docs-gate.test.js — RED/GREEN behavior spec exercising the real gate over a throwaway git repo"
  - "tests/docs-gate-role-table.test.js — role-table self-consistency spec (both-axes watched-file rule)"
  - "The executable contract for scripts/docs-gate.js (--range, cwd=repo root) and scripts/lib/role-table.js (classify + DENYLIST)"
affects: [43-05-role-table, 43-06-gate-script, 43-02-help-loader]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Throwaway --bare-origin git repo with GIT_CONFIG_GLOBAL/SYSTEM nulled for hermetic gate testing"
    - "Synthetic minimal fixture corpus (never a copy of the real content) to keep RED causes unambiguous and decoupled from content churn"
    - "runGate() treats an absent/crashed gate as a clean RED everywhere so block-only cases can't go green for the wrong reason"

key-files:
  created:
    - tests/docs-gate.test.js
    - tests/docs-gate-role-table.test.js
  modified: []

key-decisions:
  - "Gate CLI contract pinned: node scripts/docs-gate.js --range <gitRange>, cwd=repo root, exit 0 allow / non-zero block, verdict on stderr"
  - "role-table.js contract pinned: classify(relPath) → 'trigger'|'satisfier'|'denylisted'|'ignored', plus a DENYLIST array"
  - "Help satisfaction for a covered file is modeled as: edit the help satisfier OR carry a Help-Unaffected trailer (no semantic diff)"
  - "Emergency-skip anti-leak case built via side-branch skip + merge --no-ff + ordinary tip so an inherited (non-tip) skip must BLOCK"
  - "Branch forced to main explicitly (git init -b main) because the nulled git config would otherwise default to master and break origin/main..HEAD"

patterns-established:
  - "RED-first executable spec: author the behavior test before the implementation; the RED run is the deliverable"
  - "Both-axes watched-file rule proven falsifiable: an extension-only role table must go RED on the PATH axis"

requirements-completed: [GATE-01, GATE-03, GATE-04]

coverage:
  - id: D1
    description: "RED/GREEN behavior spec for the docs gate — 17 cases covering changelog/help block+pass, uncovered block, three trailers, multi-file Help-Unaffected (shared/empty/stale), tip-only emergency skip with the inherited-skip anti-leak case, release moment, origin:true tolerance, and a fenced-trailer decoy"
    requirement: GATE-01
    verification:
      - kind: unit
        ref: "node -c tests/docs-gate.test.js (valid) + node tests/docs-gate.test.js (exits 1 — RED for the right reason: gate absent)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Role-table self-consistency spec — both-axes watched rule, satisfiers never triggers, no path both denylisted and trigger, no dangling denylist entries"
    requirement: GATE-03
    verification:
      - kind: unit
        ref: "node -c tests/docs-gate-role-table.test.js (valid) + node tests/docs-gate-role-table.test.js (exits 1 — RED: role-table absent)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Release-moment (APP_VERSION bump) behavior cases — matching non-empty-highlights entry passes, missing entry blocks, origin:true tolerated"
    requirement: GATE-04
    verification:
      - kind: unit
        ref: "tests/docs-gate.test.js RELEASE cases (RED until 43-06 gate lands)"
        status: unknown
    human_judgment: false
    rationale: "The release cases are RED by design until scripts/docs-gate.js lands in 43-06; the file-level RED and node -c validity are the deliverable at this plan's boundary."

status: complete
---

# Phase 43 Plan 01: RED-First Docs-Gate Behavior Specs Summary

Authored the two Wave-1 RED-first tests that specify the docs-rot gate's blocking behavior **before any gate code exists**. Both fail RED for the right reason (their implementations are absent) — that redness is the deliverable and the proof the gate can actually block, not just ship green.

## Accomplishments

- **`tests/docs-gate.test.js`** — a throwaway-git-repo RED/GREEN harness that invokes the REAL gate (`node scripts/docs-gate.js --range <range>`, cwd = work repo) against a synthesized minimal fixture corpus. 17 cases across every required family:
  - Changelog BLOCK (names file + "changelog") / PASS (add entry).
  - Help BLOCK (names the claiming topic id + title) / PASS (Help-Unaffected trailer).
  - Uncovered watched file BLOCK (covers[]/Help-Unaffected guidance).
  - All three trailers (`Changelog-Unaffected`, `Help-Unaffected`, `Docs-Emergency-Skip`) each flip a BLOCK to a PASS; emergency skip prints a loud banner naming reason + files.
  - One multi-file `Help-Unaffected` with a shared reason passes all three; an empty reason BLOCKS; a trailer naming an unchanged path PASSES with a stale-declaration warning.
  - **Emergency skip is tip-only (anti-leak):** a skip on the range tip PASSES; the same skip on an earlier commit pulled in via `merge --no-ff` with an ordinary tip on top BLOCKS and reports the ignored inherited skip.
  - Release moment: APP_VERSION bump with a matching non-empty-highlights entry PASSES, missing entry BLOCKS, the `origin:true` entry is tolerated.
  - A `Help-Unaffected:`-looking line inside a fenced code block does NOT satisfy the gate (trailer-block decoy).
- **`tests/docs-gate-role-table.test.js`** — the role-table self-consistency spec (26 cases). Pins BOTH axes (shipped path AND code extension), so an extension-only implementation goes RED on the PATH axis (`tests/**`, `scripts/**`, `package.json`, `.github/**`, `.planning/**` are ignored, not triggers); `manifest.json` and `sw.js` are watched despite living at the root; satisfiers classify as `satisfier` never `trigger`; no path is both denylisted and a trigger; every denylist entry is a real file.

## RED-by-design — the plans that turn these GREEN

Both files are EXPECTED to fail RED at this plan's commit boundary. Do not stub the gate or role table to force green.

- `tests/docs-gate-role-table.test.js` → GREEN when **43-05** lands `scripts/lib/role-table.js` (exporting `classify` + `DENYLIST`).
- `tests/docs-gate.test.js` → GREEN when **43-06** lands `scripts/docs-gate.js` (and it depends on the 43-02/43-06 help loader resolving assets from cwd).

## Contract handed to later plans

- **Gate binary (43-06):** `node scripts/docs-gate.js --range <gitRange>`, cwd = repo root; resolves assets (help/changelog/version) from cwd, not its own install dir; exit 0 = allow, non-zero = block; verdict text on stderr; reads trailers via git's trailer parser (the fenced decoy must be ignored); `Docs-Emergency-Skip` honored only on the range tip.
- **Role table (43-05):** `classify(relPath)` returns one of `trigger` / `satisfier` / `denylisted` / `ignored`, plus a `DENYLIST` array of real repo-relative paths. Denylist must include the marketing/legal pages, their scripts, and `assets/landing.css` + `assets/demo.css`.

## Deviations from Plan

- **[Rule 1 - Falsifiability hardening]** The two block-only cases (multi-file empty-reason, fenced decoy) initially passed for the wrong reason: the absent gate's incidental non-zero exit satisfied a bare `r.code !== 0`. Hardened `runGate()` to throw a clean RED when the gate is absent OR crashes with a Node stack trace (a crash is never a legitimate verdict), and added message assertions to both cases so they can only pass on a genuine gate verdict. Result: all 17 behavior cases now fail RED uniformly for the right reason. Folded into the Task 1 commit (d497762).

## Verification

- `node -c` passes on both files.
- `node tests/docs-gate.test.js` → exit 1 (17/17 RED, all "gate script absent"); no temp dirs left under `$TMPDIR/docsgate-*`.
- `node tests/docs-gate-role-table.test.js` → exit 1 (26/26 RED, "role-table absent").
- Names follow the no-phase-prefix rule (`docs-gate.test.js`, `docs-gate-role-table.test.js`); both auto-discovered by `tests/run-all.js`'s glob.
- Comments are behavior-only — no phase/decision-ID citations (that is Phase 44).

## Note for the phase runner

`npm test` (the full suite) will now report these two files as failing until 43-05/43-06 land — this is the intended Wave-1 RED state, not a regression.

## Self-Check: PASSED

- FOUND: tests/docs-gate.test.js
- FOUND: tests/docs-gate-role-table.test.js
- FOUND commit d497762 (Task 1)
- FOUND commit e219a4b (Task 2)
