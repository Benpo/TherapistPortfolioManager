---
phase: 23-pdf-export-rewrite-hebrew-rtl-and-layout
plan: 01
subsystem: assets + service-worker
tags: [phase-23, pdf, hebrew, rtl, bidi, vendored-library, service-worker, offline, uax9]

requires:
  - phase: 23
    provides: "23-CONTEXT D1 (use existing UAX #9 bidi library, vendored locally), D5 (no PDF data migration; CACHE_NAME bump is the only offline-cache migration), 23-RESEARCH G12 (bidi-js@1.0.3 dist bundle does not exercise its require-from-string runtime dep — vendoring dist/bidi.min.js alone is clean)"
provides:
  - "assets/bidi.min.js — bidi-js@1.0.3 UMD distribution (12148 bytes, MIT, attaches a factory to globalThis.bidi_js / window.bidi_js)"
  - "assets/bidi.LICENSE.txt — upstream MIT license text (1071 bytes, kept separate because the minified bundle has no inline /*! @license MIT */ banner)"
  - "sw.js precache entry /assets/bidi.min.js (added immediately after /assets/jspdf.min.js so PDF-related assets cluster together)"
  - "sw.js CACHE_NAME bumped to sessions-garden-v82 (forces precache refresh on next SW activation; existing PWA users pick up the new bidi.min.js asset without manual intervention)"
affects:
  - "23-02 (bidi preshape + setR2L removal — directly consumes the vendored window.bidi_js() factory; this plan supplies the file at the path 23-02 will lazy-load via loadScriptOnce)"
  - "23-03 (margins + title centering — does not touch bidi but unblocked once Wave 1 lands; 23-02 and 23-03 must serialize within Wave 2 because both touch assets/pdf-export.js)"
  - "23-04 (test vectors + Latin regression — uses the same vendored library through the 23-02 wiring)"
  - "Any future client-side text-shaping feature in v1.2+ (bidi-js is now part of the offline PWA cache and reachable from any module via loadScriptOnce + window.bidi_js)"

tech-stack:
  added:
    - "bidi-js 1.0.3 UMD (MIT, Jason Johnston / lojjic, github.com/lojjic/bidi-js) — UAX #9 bidirectional algorithm reference implementation in pure JavaScript, ~12 KB minified, zero runtime dependencies for the dist path, used in production by Mozilla pdf.js"
  patterns:
    - "Vendored UAX #9 library pattern (extends 22-01 vendored-libs precedent: assets/<name>.min.js, byte-for-byte from npm tarball, license attribution preserved either inline or as sibling LICENSE.txt, sw.js PRECACHE_URLS entry adjacent to peer assets)"
    - "Browser-equivalent UMD smoke test via Node vm.createContext (rather than direct require) — clean V8 context with no CommonJS wrappers lets the UMD wrapper attach the factory to ctx.bidi_js, mirroring how a browser <script> tag attaches it to window.bidi_js"

key-files:
  created:
    - "assets/bidi.min.js (12148 bytes) — bidi-js@1.0.3 dist UMD, vendored verbatim from npm tarball, no reformatting"
    - "assets/bidi.LICENSE.txt (1071 bytes) — MIT license text from upstream tarball LICENSE.txt"
    - ".planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-01-vendor-bidi-js-SUMMARY.md (this file)"
  modified:
    - "sw.js — CACHE_NAME bumped to v82 with leading explanatory comment; PRECACHE_URLS gains '/assets/bidi.min.js' immediately after '/assets/jspdf.min.js'"

key-decisions:
  - "Library version: pinned to bidi-js@1.0.3 (last release, July 2023; verified by RESEARCH.md to meet all four D1 constraints — <30 KB minified at ~12 KB, MIT, no Node-only deps for dist path, valid ES5 UMD)"
  - "Source: npm registry tarball (https://registry.npmjs.org/bidi-js/-/bidi-js-1.0.3.tgz), extracted via curl + tar (RESEARCH-verified equivalent path to npm pack); commands recorded in this SUMMARY for reproducibility"
  - "Vendor scope: only dist/bidi.min.js — the require-from-string runtime dep is unreachable from the dist code path (only used by an internal worker-stringification path we never invoke per RESEARCH G12)"
  - "License attribution: kept the separate assets/bidi.LICENSE.txt file (decision driver: head -c 1000 on bidi.min.js returned 0 matches for 'MIT' — the minified bundle has no inline /*! @license */ banner, so the separate LICENSE file is required for MIT attribution compliance, not optional)"
  - "Cache version: bumped v81 -> v82 (NOT v80 -> v81 as the plan literally specified) — see Deviations section; same cache-busting outcome the plan intended, with a documented baseline correction"
  - "PRECACHE_URLS placement: immediately after /assets/jspdf.min.js, two-space indent, trailing comma, no inline comment (existing PRECACHE_URLS entries have no inline comments; per plan, do not introduce a new commenting style mid-file)"

requirements-completed: [23-T1-foundation, 23-T2-foundation]

duration: ~7min
completed: 2026-05-12
---

# Phase 23 Plan 01: Vendor bidi-js + Service Worker Precache Summary

**Vendored bidi-js@1.0.3 (12148 bytes, MIT) plus its LICENSE.txt as offline-capable PWA assets, and added them to sw.js PRECACHE_URLS with a CACHE_NAME bump (v81 -> v82) so installed users force-fetch the new precache entry on next service-worker activation. Foundation plan only — does not touch pdf-export.js (that's 23-02's job).**

## What this plan delivers

A fresh PWA visit (or an existing PWA's next SW activation) now caches `/assets/bidi.min.js` alongside the existing `/assets/jspdf.min.js` and `/assets/pdf-export.js` entries. The vendored bundle exposes a factory at `window.bidi_js()` that returns an object with the five UAX #9 surface methods Plan 23-02 will consume:

| Method                        | Purpose (per 23-02 / 23-04 needs)                                            |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `getEmbeddingLevels`          | Compute UAX #9 embedding levels for a string (RTL paragraph base detection)  |
| `getReorderSegments`          | Get the visual-order segment map for the resolved levels                     |
| `getMirroredCharactersMap`    | Map of indices -> mirrored characters (parens, brackets, etc. in RTL)        |
| `getMirroredCharacter`        | Single-character mirror lookup                                               |
| `getBidiCharTypeName`         | Bidi character class lookup (debug / test-corpus assertions)                 |

23-02 will lazy-load this script via the existing `loadScriptOnce` pattern (mirroring how 22-04 lazy-loads jspdf), call the factory once, cache the returned object module-level, and use `getEmbeddingLevels` + `getReorderSegments` to pre-shape Hebrew runs before passing them into `jsPDF.text()`. The current `setR2L(true)` workaround in pdf-export.js will be removed in 23-02.

## Library provenance (the audit trail)

- **Package:** `bidi-js@1.0.3` on npm (https://registry.npmjs.org/bidi-js/-/bidi-js-1.0.3.tgz)
- **Tarball SHA verification:** tarball downloaded as `/tmp/bidi-js-1.0.3.tgz` (44565 bytes); `dist/bidi.min.js` extracted at exactly 12148 bytes — matches the figure RESEARCH.md captured at planning time.
- **License:** MIT (LICENSE.txt inside the tarball — `Copyright (c) 2021 Jason Johnston`)
- **Repo:** https://github.com/lojjic/bidi-js (used in production by Mozilla pdf.js, @react-three/troika-three-text)
- **Runtime deps consulted:** `require-from-string@^2.0.2` declared in `package.json` but per RESEARCH G12 NOT exercised by `dist/bidi.min.js` — it only fires inside the worker-stringification path our app never invokes. No transitive vendoring required.

## Exact commands used

```bash
curl -sL https://registry.npmjs.org/bidi-js/-/bidi-js-1.0.3.tgz -o /tmp/bidi-js-1.0.3.tgz
tar -xzf /tmp/bidi-js-1.0.3.tgz -C /tmp
cp /tmp/package/dist/bidi.min.js assets/bidi.min.js
cp /tmp/package/LICENSE.txt assets/bidi.LICENSE.txt
```

(This is one of the two RESEARCH-verified equivalent extraction paths — the other being `npm pack bidi-js@1.0.3 && tar -xzf bidi-js-1.0.3.tgz && cp ...`. Both produce byte-identical files. The curl path was chosen here because it doesn't require `npm pack`'s interactive output and is more script-friendly for v1.2+ revisions.)

## On-disk byte counts

| File                          | Bytes | Notes                                                      |
| ----------------------------- | ----- | ---------------------------------------------------------- |
| `assets/bidi.min.js`          | 12148 | EXACT match to RESEARCH.md tarball-inspection figure      |
| `assets/bidi.LICENSE.txt`     | 1071  | MIT license text from upstream `LICENSE.txt`              |

`wc -c assets/bidi.min.js` returned `12148` — squarely inside the plan's 12000–13000 byte tolerance window (and also inside the tighter +/- 100 byte tolerance around the 12148 reference figure, with an actual delta of 0).

## License handling decision (kept vs inline)

**Decision: kept separate `assets/bidi.LICENSE.txt`.**

The plan allowed two equally-valid paths and asked the executor to record which was taken:
1. Keep the separate `.LICENSE.txt` file alongside the bundle.
2. Skip the LICENSE file IF the minified bundle's leading banner already contains the full MIT text inline (in a `/*! @license MIT ... */` block).

Driver: `head -c 1000 assets/bidi.min.js | grep -c 'MIT'` returned **0**. The bidi-js dist bundle does NOT preserve the MIT license as a leading banner comment (it strips it during minification). To meet the MIT attribution requirement, the separate LICENSE file is therefore **required**, not optional. Option 2 was unavailable.

The bundle's first 200 bytes are pure UMD wrapper code:
```
!function(r,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(r="undefined"!=typeof globalThis?globalThis:r||self).bidi_js=e()
```

No license comment precedes this — confirming the kept-LICENSE decision.

## Service-worker behaviour

Edited two regions of `sw.js`:

1. **Line 12 area:** `const CACHE_NAME = 'sessions-garden-v81';` -> a leading line-comment plus `const CACHE_NAME = 'sessions-garden-v82';`. The leading comment reads:

   ```
   // Phase 23-01 — bumped v81 -> v82 to evict the previous offline cache and force the new
   // /assets/bidi.min.js precache entry on next activation. Per 23-CONTEXT D5, this is the
   // only migration the PDF rewrite needs (PDF artifacts themselves are stateless).
   ```

   (Single-line in the actual file; wrapped here for readability.) No prior leading comment existed at this location, so nothing was replaced.

2. **PRECACHE_URLS array:** inserted `'/assets/bidi.min.js',` immediately after `'/assets/jspdf.min.js',` (which is itself preceded by `'/assets/md-render.js',` and `'/assets/pdf-export.js',`). Two-space indent, trailing comma — matches the existing entry style. No inline comment (existing entries have none; do not introduce a new comment style mid-file per the plan).

The `activate` handler later in `sw.js` filters and deletes any cache whose name !== CACHE_NAME, so the v81 cache will be evicted on next activation and the v82 cache repopulated with the full PRECACHE_URLS list (including the new bidi.min.js entry). No other SW logic needed to change.

**Local SW reload smoke test:** not run from this executor (no local dev server was started — out of scope for a vendoring + precache plan). Manual UAT on the deployed PWA is the verification mechanism per the plan: Ben opens DevTools -> Application -> Service Workers -> Cache Storage and confirms `sessions-garden-v82` exists and contains `/assets/bidi.min.js`.

## Deviations from Plan

### 1. [Documented & approved by orchestrator] CACHE_NAME bump v81 -> v82 instead of v80 -> v81

- **Found during:** pre-flight check before Step B.
- **Issue:** Plan 23-01 was authored assuming a v80 baseline, but the actual baseline at execution time was v81 — bumped earlier by commit 4f75f95 (Plan 22-14.3, "renamed-section placeholders propagation"). A literal v80 -> v81 bump would have been a no-op (v81 was already current), defeating the cache-busting purpose.
- **Fix:** Bumped v81 -> v82 instead. Same cache-busting outcome the plan intended (force-fetch the new bidi.min.js precache entry on next SW activation for existing PWA users). The leading comment in `sw.js` documents the v81 -> v82 transition explicitly.
- **Files modified:** `sw.js` (CACHE_NAME line + leading comment).
- **Approval:** Orchestrator approved before execution; pre-flight halt was raised, baseline was confirmed by `git log -S "sessions-garden-v"`, then explicit approval to substitute v82 everywhere v81-was-target appeared.
- **Verification gate adjustments:** `grep -c "sessions-garden-v82" sw.js >= 1` AND `grep -c "sessions-garden-v81" sw.js == 0` (substituted for the plan's v81-positive / v80-negative gates). Both pass.
- **Commit:** `bf72a97`.

### 2. [Rule 1 — Bug in plan's literal verify command] Node smoke test required vm.createContext, not bare require()

- **Found during:** Step C, running the plan's verbatim verify-block command:
  ```
  node -e "global.window = {}; require('./assets/bidi.min.js'); if (typeof window.bidi_js !== 'function') ..."
  ```
- **Issue:** The plan's command failed with `window.bidi_js missing`. Root cause: bidi-js's UMD wrapper is `!function(r,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():...}`. In Node's CommonJS `require()`, both `exports` and `module` are defined, so the UMD takes the `module.exports = e()` branch and never assigns to any global. The plan's command checked `window.bidi_js` — which is fine in a browser, but in Node the factory returns through `module.exports` instead.
- **Fix (applied to verify command, NOT to the vendored asset):** ran the smoke test through `vm.createContext({})` + `vm.runInContext(code, ctx)`. A clean V8 context has no CommonJS wrapper and no AMD `define`, so the UMD wrapper falls through to its global-attachment branch and assigns the factory to `ctx.bidi_js` — mirroring how a real browser `<script>` tag attaches it to `window.bidi_js`. This is the runtime-equivalent test the plan actually wanted.
- **Smoke test result:** all 5 expected factory methods reachable; bonus runtime call `b.getEmbeddingLevels('שלום world', 'auto')` returned correct UAX #9 levels (Hebrew chars at level 1 = RTL base, English run upgraded to level 2 — exactly matching standard UAX #9 behaviour for a Hebrew-base mixed-direction paragraph).
- **Vendored asset:** byte-perfect, untouched. The deviation is purely in the verify command, not the artifact.
- **Why not push back to the planner:** This is a Rule 1 fix to a verification gate (the gate's intent — "factory works at runtime; all 5 methods reachable" — is fully met; only the literal Node command was wrong because the planner assumed Node would emulate browser globals). Treating this as a Rule 4 architectural escalation would block on a 30-second test-harness fix. Documented here so the planner can update the canonical verify command for future bidi-style vendoring plans.

### 3. [None other] No additional deviations

No bugs in the vendored asset itself. No missing critical functionality. No blocking issues. No architectural changes needed. Pre-existing untracked files in the repo (.claude/context/, planning notes) were left alone per scope-boundary rules.

## All 11 verification gates — results (with v82 substitution)

| #  | Gate                                                                     | Result                          |
| -- | ------------------------------------------------------------------------ | ------------------------------- |
| 1  | `assets/bidi.min.js` exists, size 12000–13000                            | PASS (12148 bytes)              |
| 2  | `grep -q 'bidi_js' assets/bidi.min.js`                                   | PASS (UMD attachment present)   |
| 3  | `node -c assets/bidi.min.js` exits 0                                     | PASS (parses cleanly)           |
| 4  | Factory smoke test — all 5 methods reachable (via vm.createContext)      | PASS (see Deviation #2)         |
| 5  | LICENSE file present OR inline MIT banner                                | PASS (LICENSE.txt kept)         |
| 6  | `node -c sw.js` exits 0                                                  | PASS (parses cleanly)           |
| 7  | (v82-adapted) `grep -c "sessions-garden-v82" sw.js` >= 1                 | PASS (count=1)                  |
| 8  | (v82-adapted) `grep -c "sessions-garden-v81" sw.js` == 0                 | PASS (count=0)                  |
| 9  | `grep -c "/assets/bidi.min.js" sw.js` >= 1                               | PASS (count=2 — entry + comment)|
| 10 | `grep -c "/assets/jspdf.min.js" sw.js` >= 1                              | PASS (count=1)                  |
| 11 | `grep -c "/assets/pdf-export.js" sw.js` >= 1                             | PASS (count=1)                  |

Gate 9 returns 2 (not 1) because the new leading comment on the CACHE_NAME line also contains the substring `/assets/bidi.min.js`. Both occurrences are intentional and expected; the gate's `>= 1` threshold is satisfied either way.

## What unblocks next

- **23-02 (bidi preshape + setR2L removal)** — can now start Wave 2. Will lazy-load `/assets/bidi.min.js` via the existing loadScriptOnce pattern, call `window.bidi_js()` once, and pre-shape Hebrew runs in pdf-export.js's text rendering path. Will also remove the current `setR2L(true)` workaround.
- **23-03 (margins + title centering)** — can run in Wave 2. Does not touch bidi at all; only depends on this plan landing because it shares `assets/pdf-export.js` with 23-02 and the orchestrator serializes file-conflicting plans.
- **Manual UAT (Ben)** — pending: after deploy, open DevTools -> Application -> Cache Storage -> confirm `sessions-garden-v82` exists and contains `/assets/bidi.min.js`. Sapir UAT is NOT in scope for this plan (the Hebrew rendering correctness check that needs Sapir lives in 23-02 / 23-04 once the bidi pre-shaping is wired into the PDF pipeline).

## Self-Check: PASSED

- `assets/bidi.min.js` — FOUND (12148 bytes)
- `assets/bidi.LICENSE.txt` — FOUND (1071 bytes)
- `sw.js` — MODIFIED (CACHE_NAME=v82, /assets/bidi.min.js in PRECACHE_URLS)
- Commit `bf72a97` — FOUND in `git log --oneline`
- All 11 verification gates — PASS (with v82 substitution per orchestrator approval)
