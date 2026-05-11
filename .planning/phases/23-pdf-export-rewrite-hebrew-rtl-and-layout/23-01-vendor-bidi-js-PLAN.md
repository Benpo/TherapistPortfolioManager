---
phase: 23-pdf-export-rewrite-hebrew-rtl-and-layout
plan: 23-01
parent_phase: 23
title: Vendor bidi-js library + service worker precache
type: execute
wave: 1
depends_on: []
files_modified:
  - assets/bidi.min.js
  - assets/bidi.LICENSE.txt
  - sw.js
autonomous: true
requirements:
  - 23-T1
  - 23-T2
tags:
  - phase-23
  - pdf
  - hebrew
  - rtl
  - bidi
  - vendored-library
  - service-worker
  - offline
must_haves:
  truths:
    - "A session with pure Hebrew content exports a PDF where every Hebrew line reads right-to-left in correct character order. (T1 — foundation: this plan ships the UAX #9 bidi library that 23-02 consumes; without bidi.min.js loaded by the service worker into the offline cache, T1 cannot be true on subsequent visits.)"
    - "A session mixing Hebrew + English/digits exports a PDF where the bidirectional segments land in correct positions. (T2 — same foundation note: this plan vendors and precaches the library that 23-02 wires into pdf-export.js.)"
  artifacts:
    - path: "assets/bidi.min.js"
      provides: "The vendored bidi-js@1.0.3 UMD distribution. Self-contained ES5 minified bundle (~12 KB / 12148 bytes per RESEARCH.md tarball inspection). Attaches a factory function to window.bidi_js when loaded via <script> tag. Has zero runtime dependencies (the require-from-string entry in package.json is only used by a code path we never invoke — verified G12). Provides the methods 23-02 will consume: getEmbeddingLevels(text, explicitDir?), getReorderSegments(text, levels, start?, end?), getMirroredCharactersMap(text, levels, start?, end?), getMirroredCharacter(ch), getBidiCharTypeName(ch). Sourced from npm tarball bidi-js@1.0.3 dist/bidi.min.js. License MIT (D1 requires MIT/BSD/Apache)."
      contains: "bidi_js"
    - path: "assets/bidi.LICENSE.txt"
      provides: "The MIT license text from the bidi-js@1.0.3 npm tarball (LICENSE.txt inside the package). Vendored alongside bidi.min.js to preserve the MIT attribution requirement when distributing the minified bundle as part of the PWA. If the minified bundle already includes the MIT banner comment as a leading /*! ... */, this companion file may still be added for explicit visibility — both paths are acceptable; the executor records which path was taken in the SUMMARY."
      contains: "MIT"
    - path: "sw.js"
      provides: "Service worker precache list adds /assets/bidi.min.js as the 4th PDF-related asset (alongside the existing /assets/pdf-export.js and /assets/jspdf.min.js entries). CACHE_NAME bumped v80 → v81 so installed PWA users force-refresh the precache on next service-worker activation and pick up the new bidi.min.js asset (per D5 — PDF generation is stateless, so the only migration concern is the offline cache itself; this bump handles it). No other PRECACHE_URLS entries removed or reordered. The two font files (noto-sans-base64.js, noto-sans-hebrew-base64.js) stay precached unchanged."
      contains: "bidi.min.js"
  key_links:
    - from: "assets/bidi.min.js (UMD attachment)"
      to: "window.bidi_js (factory function)"
      via: "The UMD wrapper in dist/bidi.min.js attaches a factory function as window.bidi_js. Plan 23-02 calls this factory once (after loadScriptOnce resolves — see G9) and caches the returned bidi object module-level. This plan's job is to make the file available at the path 23-02 expects."
      pattern: "bidi_js"
    - from: "sw.js PRECACHE_URLS"
      to: "/assets/bidi.min.js (offline cache entry)"
      via: "The new entry sits in the same PRECACHE_URLS array as /assets/pdf-export.js (currently L58) and /assets/jspdf.min.js (currently L60). Placement: immediately after /assets/jspdf.min.js to group the PDF-related assets together. After CACHE_NAME bumps to v81, the activate handler at L154 (which filters caches whose name !== CACHE_NAME) evicts the v80 cache and the install handler at L124–126 repopulates v81 with the new entry list (including bidi.min.js)."
      pattern: "bidi.min.js"
    - from: "sw.js CACHE_NAME constant (currently L12)"
      to: "Service worker activate handler (currently L154)"
      via: "The activate handler filters and deletes any cache whose name !== CACHE_NAME. Bumping the constant from sessions-garden-v80 to sessions-garden-v81 causes the previous (v80) cache to be evicted, forcing a fresh precache fetch of all PRECACHE_URLS entries including the new bidi.min.js. This is the standard service-worker cache-versioning pattern already used by 22-15 (verified by recent SW history)."
      pattern: "sessions-garden-v81"
---

<objective>
Land the bidi-js@1.0.3 UMD bundle as a vendored asset under `assets/bidi.min.js`, add it to the service worker precache list, and bump the SW cache version so installed PWA users get the new asset on their next visit.

This is the foundation plan — it does NOT touch `pdf-export.js`. Wiring the library into the PDF pipeline is Plan 23-02's job (which depends on this plan). Plan 23-03 (margins + title centering) can also start once this plan lands, because it only touches layout constants and the title-block draw call — not the bidi pipeline. Both 23-02 and 23-03 modify `assets/pdf-export.js`, so they must run **sequentially within Wave 2** (see Phase 23 README / orchestrator notes for the file-conflict-driven serialization).

Per D1 (CONTEXT.md): use an existing UAX #9 bidi library, vendored locally per the 22-01 lazy-load pattern. No custom implementation. Library must be <30 KB minified, MIT/BSD/Apache licensed, no Node-only dependencies, browser-friendly. RESEARCH.md verified bidi-js@1.0.3 meets all four constraints: 12 KB minified, MIT, zero runtime deps for the dist path, valid ES5 UMD, used in production by Mozilla pdf.js.

Per D5 (CONTEXT.md): no data migration needed for PDF output (PDFs are write-once artifacts). The only migration concern is the offline cache — handled by the v80 → v81 bump.

Purpose: Phase 23 (PDF rewrite — Hebrew RTL + layout) needs a UAX #9 implementation in the browser. This plan ships the library and ensures offline-mode PWA users get it cached. Without it, 23-02 has nothing to call.

Output:
- New file `assets/bidi.min.js` — the vendored UMD bundle (~12 KB, exact byte size to be recorded in SUMMARY for traceability).
- New file `assets/bidi.LICENSE.txt` — the MIT license text from the npm tarball (skip only if the minified bundle's leading banner already contains the full MIT text inline; executor decides and records the choice).
- Updated `sw.js` — `/assets/bidi.min.js` added to PRECACHE_URLS; `CACHE_NAME` bumped from `sessions-garden-v80` to `sessions-garden-v81`.

**Manual UAT confirmation required from Ben** that, after deploying this plan, opening the deployed PWA's DevTools → Application → Service Workers → Cache Storage shows `sessions-garden-v81` exists and contains `/assets/bidi.min.js`. Sapir is NOT in scope for this plan — the Hebrew rendering correctness check that requires Sapir lives in 23-02 / 23-04.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-CONTEXT.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-RESEARCH.md
@sw.js

## UAT truth statements this plan contributes to (verbatim from 23-CONTEXT.md)

This plan does not directly close any of the 6 acceptance-criteria truths from 23-CONTEXT.md — it ships the **foundation** that 23-02 + 23-03 + 23-04 build on. Specifically, this plan precaches the library so that the offline-mode PWA path (which the rest of the app already relies on per the v1.0 "Zero network calls, works from file:// protocol" requirement in PROJECT.md) continues to work after 23-02 wires bidi-js into ensureDeps().

## Locked decisions from 23-CONTEXT.md (DO NOT re-litigate)

- **D1 — Bidi reordering: pre-shape via library, not custom.** Use an existing UAX #9 bidi library, vendored locally per the 22-01 lazy-load pattern. RESEARCH.md verified bidi-js@1.0.3 (Jason Johnston / lojjic, MIT, github.com/lojjic/bidi-js) meets the <30 KB / MIT / no-Node-deps / browser-friendly bar.
- **D5 — Backward compatibility & migration.** No data migration needed for the PDF artifact (PDFs are stateless write-once outputs). The CACHE_NAME bump in this plan is the offline-cache migration — installed PWA users force-refresh their precache on next activation.

## Library provenance (the audit trail)

- Package: `bidi-js@1.0.3` on npm.
- Published: 2023-07-31. Last release at time of research.
- License: MIT (file: `LICENSE.txt` inside the tarball).
- Repo: https://github.com/lojjic/bidi-js (49 stars, used in production by Mozilla pdf.js and @react-three/troika-three-text).
- Bundle size verified two ways: tarball inspection reports `dist/bidi.min.js` as 12148 bytes; bundlephobia reports 12429 B min / 5765 B gzip. The two numbers diverge by ~280 bytes because bundlephobia measures the bundled-via-bundler size which adds a tiny UMD wrapper; the on-disk file we vendor is 12148 bytes exactly. **Executor MUST verify the file size after download matches one of these two figures within reasonable tolerance.**
- Runtime deps in package.json: `require-from-string@^2.0.2`. Per RESEARCH.md G12: the dist bundle does NOT use this dep at runtime — it's only referenced in a code path that stringifies the bidi function for web-worker use, which we never invoke. **No transitive-dep vendoring is required.** Vendoring only `dist/bidi.min.js` is clean.

## How to obtain the file

The recommended path is `npm pack bidi-js@1.0.3` followed by extracting `dist/bidi.min.js` from the resulting tarball. Equivalent paths (both verified by RESEARCH.md as producing the same file):
- `curl -sL https://registry.npmjs.org/bidi-js/-/bidi-js-1.0.3.tgz -o /tmp/bidi-js-1.0.3.tgz && tar -xzf /tmp/bidi-js-1.0.3.tgz -C /tmp && cp /tmp/package/dist/bidi.min.js assets/bidi.min.js && cp /tmp/package/LICENSE.txt assets/bidi.LICENSE.txt`
- `npm pack bidi-js@1.0.3 && tar -xzf bidi-js-1.0.3.tgz && cp package/dist/bidi.min.js assets/bidi.min.js && cp package/LICENSE.txt assets/bidi.LICENSE.txt && rm -rf package bidi-js-1.0.3.tgz`

Either approach is acceptable. Executor records the exact commands used in the SUMMARY so the artifact is reproducibly fetchable in v1.2+ revisions.

## sw.js current state (verified)

- `CACHE_NAME` constant at line 12: `const CACHE_NAME = 'sessions-garden-v80';` — bump to `'sessions-garden-v81'`.
- `PRECACHE_URLS` array starts at line 19. Contains (line 58) `'/assets/pdf-export.js',` and (line 60) `'/assets/jspdf.min.js',`. **New entry `'/assets/bidi.min.js',`** is inserted immediately after the `/assets/jspdf.min.js` line so the PDF-related assets cluster together in the cache. Comma placement: the new line gets a trailing comma (matches the existing entries' style).
- The activate handler at line 154 (`caches.open... .filter(function (name) { return name !== CACHE_NAME; })`) handles eviction automatically — no other SW logic needs to change.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Vendor bidi-js@1.0.3 into assets/ + sw.js precache + CACHE_NAME bump</name>
  <files>assets/bidi.min.js, assets/bidi.LICENSE.txt, sw.js</files>
  <action>
    **Step A — Fetch the npm tarball and extract the vendored bundle (D1).** `assets/bidi.min.js`, `assets/bidi.LICENSE.txt`.

    Run one of the two RESEARCH-verified extraction commands (see <context> "How to obtain the file"). Recommended:

    `curl -sL https://registry.npmjs.org/bidi-js/-/bidi-js-1.0.3.tgz -o /tmp/bidi-js-1.0.3.tgz && tar -xzf /tmp/bidi-js-1.0.3.tgz -C /tmp && cp /tmp/package/dist/bidi.min.js assets/bidi.min.js && cp /tmp/package/LICENSE.txt assets/bidi.LICENSE.txt`

    Then verify the on-disk bytes:
    - `wc -c assets/bidi.min.js` should return 12148 (the exact tarball figure from RESEARCH.md). If the figure is off by more than 100 bytes from 12148, STOP — you've fetched the wrong version. The +/- 100 byte tolerance covers line-ending normalization on some tarball-extract paths; anything beyond that indicates a different version.
    - `head -c 200 assets/bidi.min.js` should begin with the UMD wrapper banner (something like `!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?...t.bidi_js=t()`); confirm the string `bidi_js` is in the first 500 bytes (UMD attachment to window.bidi_js).
    - `head -c 500 assets/bidi.LICENSE.txt` should contain the line "MIT License" and "Copyright" — confirms it's the right file and not a stray README.

    If the minified bundle's leading banner already contains the full MIT license text (rare but possible — some minifiers preserve `/*! @license ... */` blocks), the separate `assets/bidi.LICENSE.txt` file is **redundant**. The executor decides: if `grep -c "MIT License" assets/bidi.min.js` returns ≥1 inside the first 1000 bytes, skipping the LICENSE file is acceptable. Otherwise, keep `assets/bidi.LICENSE.txt`. Record the choice (kept / skipped) in the SUMMARY.

    Do NOT modify the bytes of `assets/bidi.min.js` after copying — no reformatting, no comment additions, no trailing newline stripping. The file is vendored verbatim from upstream.

    **Step B — Add /assets/bidi.min.js to PRECACHE_URLS and bump CACHE_NAME (D5).** `sw.js`.

    1. Locate the `const CACHE_NAME = 'sessions-garden-v80';` line (currently L12). Change `v80` to `v81` so the line reads:

       `const CACHE_NAME = 'sessions-garden-v81';`

       Add a leading line-comment immediately above this constant explaining the bump: `// Phase 23-01 — bumped v80 -> v81 to evict the previous offline cache and force the new /assets/bidi.min.js precache entry on next activation. Per 23-CONTEXT D5, this is the only migration the PDF rewrite needs (PDF artifacts themselves are stateless).` (If a leading comment already exists from a previous bump, replace its body with this new comment — do not stack comments.)

    2. Locate the `PRECACHE_URLS` array (starts L19). Find the entry `'/assets/jspdf.min.js',` (currently L60). Immediately after this entry, insert a new line:

       `  '/assets/bidi.min.js',`

       (two-space indent matching the existing entries; trailing comma matching the existing entries' style.)

       Optional but recommended: add a `//` inline-comment after the closing comma — `'/assets/bidi.min.js',   // Phase 23-01 — UAX #9 bidi library; consumed by pdf-export.js for Hebrew RTL` — so future readers see the provenance without needing to chase the plan number. Match the comment style of any existing inline comments in PRECACHE_URLS (if there are none, omit the inline comment — don't introduce a new commenting style mid-file).

    Do NOT reorder, remove, or modify any other PRECACHE_URLS entries. Do NOT modify any other line in sw.js beyond the CACHE_NAME bump and the single new PRECACHE_URLS line insertion.

    **Step C — Verification before commit.**

    - File exists with sane size: `test -f assets/bidi.min.js && [ "$(wc -c < assets/bidi.min.js)" -ge 12000 ] && [ "$(wc -c < assets/bidi.min.js)" -le 13000 ]`
    - UMD attachment is present: `grep -q 'bidi_js' assets/bidi.min.js`
    - Script parses as valid JS: `node -c assets/bidi.min.js` exits 0
    - Factory works at runtime: `node -e "global.window = {}; require('./assets/bidi.min.js'); if (typeof window.bidi_js !== 'function') throw new Error('window.bidi_js missing'); var b = window.bidi_js(); if (typeof b.getEmbeddingLevels !== 'function') throw new Error('getEmbeddingLevels missing'); console.log('OK');"` prints OK (this is the smoke test that confirms the bundled factory + all 5 expected methods are reachable; 23-02 will consume them).
    - LICENSE file present OR inline banner contains MIT text: `test -f assets/bidi.LICENSE.txt || [ "$(head -c 1000 assets/bidi.min.js | grep -c 'MIT')" -ge 1 ]`
    - sw.js still parses: `node -c sw.js`
    - CACHE_NAME bumped: `grep -c "sessions-garden-v81" sw.js` returns ≥1 AND `grep -c "sessions-garden-v80" sw.js` returns 0
    - bidi.min.js precached: `grep -c "/assets/bidi.min.js" sw.js` returns ≥1
    - jspdf precache entry still intact: `grep -c "/assets/jspdf.min.js" sw.js` returns ≥1
    - pdf-export.js precache entry still intact: `grep -c "/assets/pdf-export.js" sw.js` returns ≥1

    Commit message: `feat(23-01): vendor bidi-js@1.0.3 + sw precache (foundation for Phase 23 PDF rewrite)`
  </action>
  <verify>
    <automated>test -f assets/bidi.min.js &amp;&amp; [ "$(wc -c &lt; assets/bidi.min.js)" -ge 12000 ] &amp;&amp; [ "$(wc -c &lt; assets/bidi.min.js)" -le 13000 ] &amp;&amp; grep -q 'bidi_js' assets/bidi.min.js &amp;&amp; node -c assets/bidi.min.js &amp;&amp; node -e "global.window = {}; require('./assets/bidi.min.js'); if (typeof window.bidi_js !== 'function') throw new Error('window.bidi_js missing'); var b = window.bidi_js(); if (typeof b.getEmbeddingLevels !== 'function') throw new Error('getEmbeddingLevels missing'); if (typeof b.getReorderSegments !== 'function') throw new Error('getReorderSegments missing'); if (typeof b.getMirroredCharactersMap !== 'function') throw new Error('getMirroredCharactersMap missing'); if (typeof b.getBidiCharTypeName !== 'function') throw new Error('getBidiCharTypeName missing');" &amp;&amp; { test -f assets/bidi.LICENSE.txt || [ "$(head -c 1000 assets/bidi.min.js | grep -c 'MIT')" -ge 1 ]; } &amp;&amp; node -c sw.js &amp;&amp; [ "$(grep -c 'sessions-garden-v81' sw.js)" -ge 1 ] &amp;&amp; [ "$(grep -c 'sessions-garden-v80' sw.js)" -eq 0 ] &amp;&amp; [ "$(grep -c '/assets/bidi.min.js' sw.js)" -ge 1 ] &amp;&amp; [ "$(grep -c '/assets/jspdf.min.js' sw.js)" -ge 1 ] &amp;&amp; [ "$(grep -c '/assets/pdf-export.js' sw.js)" -ge 1 ]</automated>
  </verify>
  <done>
    - `assets/bidi.min.js` exists, size between 12000–13000 bytes, parses as valid JS, contains the `bidi_js` UMD attachment, and the Node smoke test confirms all 5 expected factory methods (getEmbeddingLevels, getReorderSegments, getMirroredCharactersMap, getMirroredCharacter, getBidiCharTypeName) are reachable.
    - License attribution present: either `assets/bidi.LICENSE.txt` exists with the MIT license text from the upstream tarball, OR the minified bundle's leading banner already contains the MIT text inline (executor confirms which path was taken in the SUMMARY).
    - `sw.js` parses, `CACHE_NAME` bumped from `sessions-garden-v80` to `sessions-garden-v81` exactly once, and `/assets/bidi.min.js` appears in `PRECACHE_URLS` adjacent to the existing PDF-related entries (`/assets/pdf-export.js`, `/assets/jspdf.min.js`).
    - No other line in `sw.js` modified. No reformatting of `assets/bidi.min.js` (vendored verbatim).
    - SUMMARY records: exact npm tarball commands used, on-disk byte count, license-file kept-or-skipped decision.
  </done>
</task>

</tasks>

<verification>
- Library bundle vendored: `test -f assets/bidi.min.js` AND size 12000–13000 bytes AND `node -c assets/bidi.min.js` exits 0.
- UMD factory works at runtime: Node smoke test confirms window.bidi_js() returns an object with all 5 expected methods.
- License attribution present: either `assets/bidi.LICENSE.txt` exists or the minified bundle's banner has MIT text inline.
- Service worker precaches the new asset: `grep -c '/assets/bidi.min.js' sw.js` ≥1.
- Cache version bumped: `grep -c 'sessions-garden-v81' sw.js` ≥1 AND `grep -c 'sessions-garden-v80' sw.js` == 0.
- Existing PDF asset entries unchanged: `grep -c '/assets/pdf-export.js' sw.js` ≥1 AND `grep -c '/assets/jspdf.min.js' sw.js` ≥1.
- Service worker still parses: `node -c sw.js` exits 0.
- Manual UAT (Ben): after deployment, DevTools → Application → Cache Storage shows `sessions-garden-v81` containing `/assets/bidi.min.js`.
</verification>

<success_criteria>
- [ ] `assets/bidi.min.js` exists at the expected size with valid JS + factory-method smoke test passing.
- [ ] License attribution present (file or inline banner).
- [ ] `sw.js` PRECACHE_URLS contains `/assets/bidi.min.js`.
- [ ] `sw.js` CACHE_NAME is `sessions-garden-v81` (no `v80` references remain).
- [ ] All 11 automated grep/node gates in the task <verify> block pass.
- [ ] Ben confirms the bumped cache appears in DevTools after deploy.
- [ ] Plans 23-02 (which imports the library) and 23-03 (which depends only on this plan landing, not on 23-02) can now start. Note: 23-02 and 23-03 both touch `assets/pdf-export.js` and therefore must run sequentially within Wave 2 — orchestrator handles the serialization.
</success_criteria>

<output>
After completion, create `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-01-vendor-bidi-js-SUMMARY.md` capturing:
- Exact `npm pack` / `curl` command used.
- Final on-disk byte count of `assets/bidi.min.js`.
- LICENSE handling: separate `.LICENSE.txt` file kept, or inline banner sufficient — which path was taken and why.
- Service-worker behaviour confirmed locally (if the executor ran a local SW reload, what was observed; otherwise note "manual UAT pending on Ben's deployed env").
- Any deviations from the planned approach.
</output>
</content>
</invoke>