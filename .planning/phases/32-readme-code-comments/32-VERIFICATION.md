---
phase: 32-readme-code-comments
verified: 2026-06-29T09:45:00Z
status: human_needed
score: 20/20 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Read each of the 6 how-do-I recipes in README.md and cross-check the mechanics against the live file it documents: recipe 2 (ship a change) vs .github/workflows/deploy.yml; recipe 3 (bump version) vs assets/version.js; recipe 4 (add translation) vs assets/i18n-*.js + package.json; recipe 5 (add JS module) vs sw.js PRECACHE_URLS. Focus: does the recipe accurately reflect every nuance of the real workflow (e.g. the sed-stamp only on the staging copy, the INTEGRITY_TOKEN being deploy-stamped not hand-set, the 4 i18n files to touch)?"
    expected: "Each recipe step is accurate and complete for the stated live file — no from-memory drift, no missing steps, no stale mechanics"
    why_human: "Structural presence of recipes is verified by grep. Content accuracy (do the described steps actually match what the code/CI does?) is a narrative-fidelity judgment that requires reading both the recipe and the live file; grep cannot catch a step that is plausible but wrong"
  - test: "Spot-check the 32-HELP-CONTENT-INVENTORY.md: (a) pick 3–4 leaves across different sections and confirm each carries all 4 tags {persona source, P26 status, suggested format, priority}; (b) confirm the P26 7-step workflow spine topics are all present; (c) confirm license.html features (activation, trial, 2-device, re-activation) appear as topics; (d) confirm no help-copy paragraphs — every leaf is title + one-line intent only"
    expected: "Every sampled leaf has a complete 4-tag set; spine steps and license topics are present; no leaf contains help copy (a sentence that could be pasted directly into a help page)"
    why_human: "Automated greps confirmed persona/priority/intent keys and demo exclusion exist. The completeness of the tag set per-leaf and the 'inventory only / no help copy' discipline require reading the actual leaf content"
---

# Phase 32: README + Code Comments — Verification Report

**Phase Goal:** The maintainer (Ben + his AI agents) can run, deploy, and understand the app's architecture from an in-repo project README, and the refactored modules carry comments describing their structure and responsibilities.
**Verified:** 2026-06-29T09:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All 20 must-have truths across 4 plans are VERIFIED by automated and structural checks. Two content-quality items need human review before the phase can be closed.

#### Plan 01 Truths (DOCS-01 — README + deploy.yml)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A maintainer or agent can run, deploy, and ship a change to the app from the README alone, calibrated for a technically-comfortable owner + his AI agents — not a non-technical first-timer (D-01) | VERIFIED | README opens: "written for the owner working with AI coding agents (cloud or local)"; all required sections present |
| 2 | README lives in-repo as agent context; keeps local-serve instructions (localhost + Web Crypto); drops multi-machine-collaboration framing (D-02) | VERIFIED | README mentions "cloud or local" agents; localhost with Web Crypto explanation present; no multi-machine framing |
| 3 | Exactly ONE in-repo README, rewriting the existing root README.md — not split, not a separate MAINTAINING.md (D-03) | VERIFIED | `test -f README.md` passes; file is the root README, not a new path |
| 4 | README is operational-first with ~6 verified how-do-I recipes (D-06) | VERIFIED | 6 recipe headings (`### …run the tests?` · `…ship a change?` · `…bump the app version?` · `…add or edit a translation string?` · `…add a new JS module?` · `…add a client-side DB operation?`) + top-level Run locally section |
| 5 | README has "Rules an agent must not break" section covering: zero-runtime-dependency production; IIFE script-load-order / cross-window.* chain; pre-commit SW-bump gotcha; PRECACHE_URLS upkeep; no external network calls (D-07) | VERIFIED | Grep: `grep -q 'Rules an agent must not break' README.md` PASS; section text covers all 5 invariants |
| 6 | README carries its OWN self-contained current file-map (post-refactor) and POINTS TO .planning/codebase/*.md for deeper architecture — does not duplicate (D-08) | VERIFIED | File-map lists settings-snippets.js, settings-photos.js, export-modal.js (grep PASS); `grep -q '.planning/codebase' README.md` PASS |
| 7 | Maintainer README is no longer published at the product URL — `cp README.md deploy-staging/` line removed from deploy.yml (D-04); rest of pipeline intact | VERIFIED | `! grep -q 'cp README.md' .github/workflows/deploy.yml` PASS; `cp _headers`, `sed -i`, "Verify no sensitive files" all still present |

#### Plan 02 Truths (DOCS-02 Part A — 3 extracted modules)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | Each of the 3 extracted modules (export-modal.js, settings-snippets.js, settings-photos.js) carries a plain what-it-does header following the four-slot responsibility-banner convention: owns · public surface · window.* deps · invariants (DOCS-02, D-09, D-10b) | VERIFIED | Read each file: export-modal.js lines 1-19 (gold-standard template), settings-snippets.js lines 1-22, settings-photos.js lines 1-24 — all four slots present |
| 9 | All build-history archaeology removed from the 3 files — header titles and inline reference tags rewritten into plain prose, historical tag dropped (D-10a) | VERIFIED | Broadened archaeology grep over all 3 files returns empty (DEPHASE_CLEAN PASS) |
| 10 | Edits are provably comments-only: green suite + deterministic strip-and-compare shows zero code lines changed (D-11) | VERIFIED | `COMMENTS_ONLY_OK` vs baseline 5526589; final comprehensive strip-and-compare vs bb7d022 also PASS for all 3 files |
| 11 | These edits + plan 03 establish the reusable comment convention + comments-only-diff process for a later batch-2 phase (D-12) | VERIFIED | Both plans complete; 32-COMMENT-COVERAGE-MAP.md documents the pilot convention for batch-2 |

#### Plan 03 Truths (DOCS-02 Part B — 2 slimmed parents)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 12 | settings.js carries a rewritten orientation banner reflecting its post-refactor SLIMMED shape — explicitly notes Snippets section + Photos tab were extracted OUT into their own modules — four-slot convention: owns · public surface · window.* deps · invariants (DOCS-02, D-10b) | VERIFIED | Lines 1-29: JSDoc `/** */` banner, "EXTRACTED OUT" slot names `settings-snippets.js` and `settings-photos.js`; grep EXTRACTION_NOTED PASS |
| 13 | add-session.js gains a BRAND-NEW top-of-file header banner (previously none): what it owns, public surface, export-modal boot handshake at load, window.* dependencies, invariants (DOCS-02, D-10b) | VERIFIED | `head -3 assets/add-session.js` starts with `//` (HAS_BANNER PASS); banner covers all four slots; documents `window.__exportModalInit(ctx)` handshake |
| 14 | All build-history archaeology removed from both files (D-10a) | VERIFIED | Broadened archaeology grep over both files returns empty (DEPHASE_CLEAN PASS) |
| 15 | Edits are provably comments-only: green suite + strip-and-compare (D-11) | VERIFIED | `COMMENTS_ONLY_OK` vs baseline f3f723b; comprehensive strip-and-compare vs bb7d022 PASS for both files |
| 16 | Together with plan 02 these complete the comment pilot establishing the reusable convention + comments-only-diff process for batch-2 (D-12) | VERIFIED | All 5 files covered; coverage map documents the pilot outcome |

#### Plan 04 Truths (planning by-product artifacts)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 17 | Comment-coverage map exists at 32-COMMENT-COVERAGE-MAP.md — every production JS module flagged done/remaining, 5 pilot files done, db.js/overview.js/sessions.js as batch-1 (D-14) | VERIFIED | File exists; grep: batch-1 PASS, db.js PASS, overview.js PASS, sessions.js PASS, done PASS |
| 18 | Help-content inventory exists at 32-HELP-CONTENT-INVENTORY.md — EN-only topic/workflow tree, each leaf has title + one-line intent + mapped feature/page + 4 tags {persona source, P26 status, suggested format, priority}, INVENTORY ONLY (D-13) | VERIFIED | File exists; grep: persona PASS, priority PASS, intent PASS, sources/grounding PASS |
| 19 | Help inventory grounded in current live app + P26 7-step spine; EXCLUDES demo.html / demo-hints.js as topic source (D-13) | VERIFIED | Sources/Grounding section present; explicit demo-exclusion note: `demo.html / demo-hints.js / demo-seed.js are stale and are NOT a topic source`; grep PASS |
| 20 | Both artifacts live in .planning/ and seed future phases; neither is shipped | VERIFIED | Both paths are under `.planning/phases/32-readme-code-comments/`; deploy.yml "Verify no sensitive files" blocks `.planning/` from reaching the deploy artifact |

**Score:** 20/20 truths verified (0 present-but-behavior-unverified)

---

### Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `README.md` | VERIFIED | Exists, substantive (191 lines, all required sections), wired as agent context per its own preamble |
| `.github/workflows/deploy.yml` | VERIFIED | Exists; `cp README.md` line removed; rest of pipeline intact (one deletion, verified by git diff) |
| `assets/export-modal.js` | VERIFIED | Exists; four-slot banner present (lines 1-19); DEPHASE_CLEAN; COMMENTS_ONLY_OK |
| `assets/settings-snippets.js` | VERIFIED | Exists; four-slot banner + Cross-IIFE chain block; DEPHASE_CLEAN; COMMENTS_ONLY_OK |
| `assets/settings-photos.js` | VERIFIED | Exists; four-slot banner; DEPHASE_CLEAN; COMMENTS_ONLY_OK |
| `assets/settings.js` | VERIFIED | Exists; JSDoc banner with EXTRACTED OUT slot; DEPHASE_CLEAN; COMMENTS_ONLY_OK (including post-CR fix 9ab2360) |
| `assets/add-session.js` | VERIFIED | Exists; NEW banner from scratch; HAS_BANNER; DEPHASE_CLEAN; COMMENTS_ONLY_OK |
| `.planning/.../32-COMMENT-COVERAGE-MAP.md` | VERIFIED | Exists; per-module table, batch-1 flagged, 5 pilot files done |
| `.planning/.../32-HELP-CONTENT-INVENTORY.md` | VERIFIED | Exists; persona lenses, 4-tag schema, Sources/Grounding section, demo exclusion |

---

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| README.md recipes | `.github/workflows/deploy.yml`, `assets/version.js`, `sw.js`, `package.json` | Key terms (`npm test`, `python3 -m http.server`, `APP_VERSION`, `PRECACHE_URLS`) present in README and confirmed to exist in the target files | VERIFIED |
| README.md architecture section | `.planning/codebase/*.md` | Pointer: "For deeper background, see the codebase maps..."; not duplicated | VERIFIED |
| `cp README.md` absence in deploy.yml | README staying repo-only | Negative grep confirms line is gone; rest of pipeline intact | VERIFIED |
| settings.js banner | settings-snippets.js + settings-photos.js extraction | Banner names both child modules in "EXTRACTED OUT" slot | VERIFIED |
| add-session.js banner | export-modal.js handshake | Banner documents `window.__exportModalInit(ctx)` boot call pairing with export-modal.js | VERIFIED |
| comments-only guarantee | pre-phase baseline bb7d022 | Comprehensive strip-and-compare (all 5 files vs bb7d022): COMMENTS_ONLY_OK | VERIFIED |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — this phase produces documentation and comment-only edits. No runnable entry points are being created or modified. The test suite green state (106/106, confirmed by orchestrator) is the behavior backstop for the comment-only edits.

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DOCS-01 | Plan 01 (primary) | README documents run/deploy/architecture for the maintainer | SATISFIED | All section greps pass; deploy.yml cleaned; audience correctly framed for Ben + agents per D-01 |
| DOCS-02 | Plan 02 + Plan 03 (both required) | Refactored modules carry code-level comments describing structure and responsibilities | SATISFIED | All 5 files: four-slot banners present, de-phased, comments-only proven; coverage spans exactly the D-09 set (3 extracted + 2 slimmed parents) |

**Note on DOCS-01 wording in REQUIREMENTS.md:** The requirements file reads "written for Sapir as the ongoing maintainer" — this wording is stale. The phase was re-scoped by decision D-01 (32-CONTEXT.md), which the ROADMAP.md itself already reflects ("Audience reframed by 32-CONTEXT D-01/D-02 — supersedes the original 'for Sapir' wording"). The README is correctly addressed to Ben + AI agents; this is not a miss.

**DOCS-02 cross-plan verification:** Plan 02 covers the 3 extracted modules; Plan 03 covers the 2 slimmed parents. Neither plan alone satisfies DOCS-02 — together they cover all 5 D-09 files. Both plans are complete. DOCS-02 is satisfied by the combination.

---

### Anti-Patterns Found

| File | Pattern | Severity | Notes |
|------|---------|----------|-------|
| (none) | — | — | De-phase archaeology grep: DEPHASE_CLEAN on all 5 JS files. No TODO/TBD/FIXME in modified files. No stub patterns. |

**Code review fix (9ab2360):** The orchestrator's code review flagged `pickBackupFolder` listed in settings.js dependency banner but not actually called by that file. Fixed in commit 9ab2360 (one-word deletion inside the JSDoc block comment). Verified comment-only by git diff inspection. De-phase grep still passes (no new archaeology). Comprehensive strip-and-compare vs bb7d022 confirms COMMENTS_ONLY_OK.

---

### Human Verification Required

#### 1. Recipe Accuracy — How do I... section

**Test:** Read each of the 6 how-do-I recipes in `README.md` and cross-check the described mechanics against the live file it documents. Focus checks: (a) "ship a change" recipe vs `.github/workflows/deploy.yml` — does the recipe correctly describe the explicit allow-list staging, the sed-stamp on the staging copy only, and the force-push to `deploy`? (b) "bump the app version" recipe vs `assets/version.js` — does it correctly describe APP_VERSION as a hand-set semver constant (not derive-from-anywhere) and INTEGRITY_TOKEN as deploy-stamped (never hand-set)? (c) "add a translation string" recipe — does it correctly name all four dictionaries and the `App.t()` / `data-i18n` usage?

**Expected:** Each recipe step accurately and completely reflects the live workflow — no plausible-but-wrong steps, no missing steps, no mechanics that have drifted since the recipes were written.

**Why human:** Structural presence of all recipes is verified by grep (`npm test`, `python3 -m http.server`, `APP_VERSION`, `PRECACHE_URLS` — all pass). Content fidelity — whether the described workflow matches what the code and CI actually do — is a narrative-accuracy judgment. The PLAN itself flagged this as `human_judgment: true` with the rationale "a maintainer should read the recipes once."

#### 2. Help-Content Inventory — Completeness and Inventory-Only Discipline

**Test:** (a) Pick 4–5 leaves across different sections of `32-HELP-CONTENT-INVENTORY.md` and confirm each carries the full 4-tag set: `{persona source · P26 status · suggested format · priority}`. (b) Confirm the P26 7-step workflow spine steps are all represented as topics. (c) Confirm `license.html` features (activation, trial limits, 2-device transfer, re-activation, purchase) appear as topics. (d) Confirm no leaf contains help copy — every entry is title + one-line intent only, not a sentence you could paste into a help page.

**Expected:** All sampled leaves have complete 4-tag sets; the spine is fully represented; license features are covered; the document is inventory-only with no copy.

**Why human:** The automated greps confirmed the presence of `persona`, `priority`, `intent`, `sources/grounding`, and the demo exclusion note. The per-leaf completeness and "inventory only" discipline require reading the actual leaf content, which varies across the document.

---

### Gaps Summary

No gaps. All 20 must-have truths verified. No blockers.

The two human verification items are content-quality checks — they do not block the phase from being structurally complete, but should be confirmed before closing the milestone.

---

_Verified: 2026-06-29T09:45:00Z_
_Verifier: Claude (gsd-verifier)_
