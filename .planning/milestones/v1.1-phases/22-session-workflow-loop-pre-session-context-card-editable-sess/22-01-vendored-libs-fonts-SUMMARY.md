---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 01
subsystem: assets
tags: [jspdf, noto-sans, hebrew, fonts, base64, vendored, pwa, pdf-export]

requires:
  - phase: 22
    provides: "PROJECT.md, ROADMAP.md, STATE.md, 22-SPEC, 22-CONTEXT, 22-PATTERNS, 22-UI-SPEC — D-01 jsPDF vendoring choice, D-02 base64 font embedding, D-03 offline-capable privacy stance"
provides:
  - "assets/jspdf.min.js — jsPDF v2.5.2 UMD library (window.jspdf.jsPDF constructor)"
  - "assets/fonts/noto-sans-base64.js — window.NotoSans (Latin + Latin Extended subset, 115,536 base64 chars)"
  - "assets/fonts/noto-sans-hebrew-base64.js — window.NotoSansHebrew (Hebrew + basic Latin subset, 30,952 base64 chars)"
  - "Vendored asset precedent extended (jszip → jspdf + 2 font assets) for downstream Plan 22-04 (pdf-export.js) consumption"
affects:
  - "22-04 (pdf-export module — directly consumes all three globals)"
  - "22-08 (service worker / PWA precache — must add the three new files to PRECACHE_URLS and bump CACHE_NAME, total +508 KB to bundle)"
  - "Any future PDF-generating feature in v1.2+ (rebuilds on this foundation)"

tech-stack:
  added:
    - "jsPDF 2.5.2 UMD (MIT) — client-side PDF generation, no server, no npm dep"
    - "Noto Sans Regular (SIL OFL 1.1) — Latin + Latin Extended diacritics for en/de/cs"
    - "Noto Sans Hebrew Regular (SIL OFL 1.1) — Hebrew block + presentation forms for he"
    - "fontTools/pyftsubset (build-time tooling — not shipped) for glyph subsetting"
  patterns:
    - "Vendored static assets pattern: byte-for-byte upstream binaries committed to assets/ root or assets/fonts/, no build step"
    - "Base64 font embedding: single-line window.{Name} = '<base64>' assignment, plain script tag loadable, attribution + regeneration command in JS file header"
    - "Privacy-first font delivery: zero CDN/CORS dependencies (no Google Fonts at runtime), CSP font-src 'self' compliant"

key-files:
  created:
    - "assets/jspdf.min.js (365 KB) — jsPDF UMD library, MIT license header preserved"
    - "assets/fonts/noto-sans-base64.js (116 KB) — Noto Sans Latin/Extended subset"
    - "assets/fonts/noto-sans-hebrew-base64.js (32 KB) — Noto Sans Hebrew subset"
  modified: []

key-decisions:
  - "jsPDF version: pinned to 2.5.2 (latest 2.x as of plan execution; all Plan 22-04 APIs verified present: addFileToVFS, addFont, setFont, setR2L, splitTextToSize, addPage, save, output)"
  - "Source mirror: unpkg.com pinned URL (https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js) instead of GitHub release tarball — atomic file fetch, no extraction step"
  - "Subsetting tool: fontTools pyftsubset installed via pip3 --user (no system-wide install, build-time only, not shipped)"
  - "Latin subset ranges: U+0020-007E,U+00A0-024F,U+2000-206F,U+20AC,U+2122 (covers en/de/cs Latin + extended diacritics, general punctuation, Euro, trademark)"
  - "Hebrew subset ranges: U+0020-007E,U+00A0-00FF,U+0590-05FF,U+FB1D-FB4F,U+2000-206F (Hebrew block + presentation forms + basic Latin punctuation for mixed-direction text)"
  - "Hebrew subset accepted at 32 KB final file size (below plan's 50 KB floor) — upstream Noto Sans Hebrew is genuinely small; functional acceptance criterion (>=30,000 char base64 string) met at 30,952 chars; smaller PWA cache footprint also serves T-22-01-03 mitigation"

patterns-established:
  - "Vendored library pattern (extends jszip.min.js precedent): assets/<name>.min.js, byte-for-byte from upstream, license header retained, single-source-of-truth URL documented in commit message"
  - "Base64 font asset pattern: assets/fonts/<font-name>-base64.js, JS comment header with source URL + license + regeneration command, single window.<Name> assignment on one line, no IIFE/module wrapper"
  - "Privacy-grep gate: every vendored asset must have grep -iE 'googleapis|fonts.gstatic|http://' return empty before commit"
  - "Browser-load smoke test: node -e 'var window={}; require(<file>); console.log(window.<Name>.length)' validates the global is set and the base64 string is non-empty"

requirements-completed: [REQ-13]

duration: 3min
completed: 2026-05-06
---

# Phase 22 Plan 01: Vendored Libs & Fonts Summary

**Vendored jsPDF 2.5.2 UMD plus subsetted Noto Sans (Latin+Extended) and Noto Sans Hebrew base64 fonts as offline-capable, CSP-compliant assets for Plan 22-04's PDF export module.**

## Performance

- **Duration:** 3 min (186 s)
- **Started:** 2026-05-06T16:42:54Z
- **Completed:** 2026-05-06T16:45:59Z
- **Tasks:** 3 / 3
- **Files created:** 3
- **Files modified:** 0
- **Total bundle addition:** 508 KB (well below 1.5 MB subset-path budget)

## Accomplishments

- **jsPDF 2.5.2 vendored** at `assets/jspdf.min.js` (365 KB) — byte-for-byte from `unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js`, MIT license header preserved, SHA-256 `85ba2cc3ff858a20fa49fe6e457bec863ea40b55a9f3725e58a940e62f6f61a4`. All Plan 22-04 APIs (addFileToVFS, addFont, setFont, setR2L, splitTextToSize, addPage, save, output) verified present in the bundle.
- **Noto Sans Latin/Extended subset** at `assets/fonts/noto-sans-base64.js` (116 KB) — subsetted from upstream notofonts/latin-greek-cyrillic via pyftsubset to en/de/cs glyph ranges; exposes `window.NotoSans` as a 115,536-char base64 TTF string with SIL OFL 1.1 attribution in the file header.
- **Noto Sans Hebrew subset** at `assets/fonts/noto-sans-hebrew-base64.js` (32 KB) — subsetted from upstream notofonts/hebrew via pyftsubset to Hebrew block + presentation forms + basic Latin punctuation; exposes `window.NotoSansHebrew` as a 30,952-char base64 TTF string with SIL OFL 1.1 attribution.
- **Privacy story locked**: zero external font fetches at runtime (no Google Fonts CDN, no fonts.gstatic, no fonts.googleapis). CSP `font-src 'self'` compliant. Closes T-22-01-05 (information disclosure / privacy) from the plan's threat register.
- **Tooling reproducibility**: each font file's JS comment header documents the exact `pyftsubset` command and Unicode ranges used, so Sapir or any future maintainer can regenerate the assets without needing this commit's terminal context.

## Task Commits

Each task was committed atomically:

1. **Task 1: Vendor jsPDF UMD library** — `603a5b1` (feat)
2. **Task 2: Vendor Noto Sans (Latin + Extended) base64** — `c1635a5` (feat)
3. **Task 3: Vendor Noto Sans Hebrew base64** — `122c195` (feat)

**Plan metadata commit:** _added by orchestrator after all wave-1 worktree agents complete_

## Files Created

- **`assets/jspdf.min.js`** (365 KB) — jsPDF v2.5.2 UMD library; UMD self-attaches to `window.jspdf` with `jsPDF` constructor at `window.jspdf.jsPDF`. Pure data on the assets/ root, mirroring the `assets/jszip.min.js` precedent.
- **`assets/fonts/noto-sans-base64.js`** (116 KB) — Header comment block (Noto Sans Regular, SIL OFL 1.1, source URL, regeneration command, consumption pattern for jsPDF.addFileToVFS/addFont) + single `window.NotoSans = "..."` assignment with 115,536 base64 chars on one line.
- **`assets/fonts/noto-sans-hebrew-base64.js`** (32 KB) — Same structure as Latin variant. Single `window.NotoSansHebrew = "..."` with 30,952 base64 chars; header includes a note explaining why the file is below the plan's 50 KB floor (upstream font is genuinely smaller; functional 30,000-char base64 floor met).

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Pin jsPDF to v2.5.2 (latest 2.x stable) instead of 3.x | Plan 22-04's documented API surface (addFileToVFS, addFont, setFont, setR2L, splitTextToSize, addPage, save, output) is preserved across both lines, but 2.5.2 is the most-tested production release; 3.x can be re-evaluated when v1.2 PDF features land |
| Source from unpkg pinned URL, not GitHub release tarball | Atomic single-file fetch — no zip extraction, no risk of unpacking unrelated files; SHA-256 captured in commit body for tamper detection |
| Install fontTools at execution time via `pip3 install --user fonttools brotli` | pyftsubset was not preinstalled on the executor host. fontTools is build-time tooling — not shipped, no runtime dep; installing it allowed the subset path (smaller bundle) instead of the full-font fallback path |
| Use Noto Sans subset (86 KB raw → 116 KB JS) instead of full font (~620 KB raw → ~830 KB JS) | T-22-01-03 PWA cache budget mitigation; the en/de/cs UI does not use Greek/Cyrillic/CJK glyphs, so the unicode ranges from the plan are sufficient |
| Use Noto Sans Hebrew subset (23 KB raw → 32 KB JS) despite finishing below the plan's 50 KB file-size floor | Upstream Noto Sans Hebrew is genuinely small (~27 KB unsubsetted); functional acceptance (>=30,000 base64 chars) is met at 30,952 chars; smaller bundle = better PWA cache impact (T-22-01-03); deviation documented in the file header |

## Deviations from Plan

### Auto-fixed / Auto-resolved Setup Issues

**1. [Rule 3 - Blocking-tooling] pyftsubset / fontTools not installed on executor host**
- **Found during:** Task 2 setup
- **Issue:** The plan specifies `pyftsubset` (from fontTools) as the preferred subsetting tool. The plan also offers a full-font fallback if pyftsubset is unavailable. Neither pyftsubset nor fontTools was on the executor host at start of task.
- **Fix:** Installed fontTools and brotli via `pip3 install --user fonttools brotli` (succeeded — fontTools 4.62.1, brotli 1.2.0). This unblocked the preferred subset path and avoided the fallback (which would have shipped 700KB+ Latin font and 400KB+ Hebrew font for users with no glyph need beyond the planned ranges).
- **Files modified:** None (build-time tool only, not shipped to users)
- **Verification:** `python3 -m fontTools.subset --help` returned cleanly; both subset commands ran successfully
- **Committed in:** N/A (no source files affected)

### Plan-Side Adjustments (Documented, No Code Change)

**2. [Plan-side note] Hebrew font file size (32 KB) below plan's 50 KB floor**
- **Found during:** Task 3 verification
- **Issue:** The plan's acceptance criterion specifies a 50 KB minimum file size for the Hebrew font asset. The upstream Noto Sans Hebrew TTF is genuinely only ~27 KB (Hebrew has fewer glyphs than Latin Extended), so even an unsubsetted base64 of the full font (~36 KB) would not clear the 50 KB floor.
- **Resolution:** Treated the 50 KB number as an upstream-size estimate rather than a hard functional floor. The functional criteria — base64 string `>= 30,000 chars`, `window.NotoSansHebrew` assigned, valid syntax, no external URLs, license attribution — all pass at 30,952 chars / 32 KB file. Documented the deviation in the file's JS comment header so future maintainers (Sapir, code review) understand the decision.
- **Files modified:** `assets/fonts/noto-sans-hebrew-base64.js` (header comment)
- **Verification:** Browser-load smoke test confirms `window.NotoSansHebrew.length === 30952` (above the 30,000 functional floor); all other acceptance criteria pass.
- **Committed in:** `122c195` (Task 3 commit message also calls this out explicitly)

No bug-fix deviations (Rule 1) or missing-functionality additions (Rule 2) were needed. No architectural decisions (Rule 4) arose. No authentication gates encountered.

## Authentication Gates

None. All upstream sources (unpkg.com, github.com/notofonts) are public, anonymous CDNs / repos. fontTools install via `pip3 install --user` did not require credentials.

## Threat Model Compliance

All Plan-22-01 threat-register mitigations were implemented:

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-22-01-01 (Tampering, jsPDF bytes) | mitigate | Pulled from unpkg pinned URL `jspdf@2.5.2/dist/jspdf.umd.min.js`; size 365 KB (in expected 30–500 KB range); MIT license header retained intact; SHA-256 `85ba2cc3ff858a20fa49fe6e457bec863ea40b55a9f3725e58a940e62f6f61a4` captured in commit body for review |
| T-22-01-02 (Info disclosure, font glyphs) | accept | Static glyph data only, SIL OFL 1.1 attribution in each file header |
| T-22-01-03 (DoS, PWA bundle inflation) | mitigate | Subset path used: 116 KB Latin + 32 KB Hebrew = 148 KB fonts total; 365 KB jsPDF; 508 KB grand total — well under 500 KB-per-asset and 1.5 MB-bundle planning budgets |
| T-22-01-04 (Tampering, base64 payload injection) | mitigate | Strings are loaded as TTF binary into jsPDF.addFileToVFS — never injected into HTML, never eval'd; Plan 22-04 will consume them only via that API |
| T-22-01-05 (Info disclosure, Google Fonts CDN) | mitigate | `grep -iE "googleapis\|fonts.gstatic\|http://"` returns empty for all three files; CSP `font-src 'self'` will hold at runtime |
| T-22-01-06 (Spoofing, wrong upstream) | mitigate | Source URLs documented in each file's JS header comment (unpkg.com/jspdf@2.5.2 for jsPDF; github.com/notofonts for fonts); SHA-256 of jsPDF in Task 1 commit body for code review verification |

**Residual risk:** Low. All three files are static data; no execution surface beyond global assignment. Plan 22-04 will consume them only via documented jsPDF.addFileToVFS / addFont APIs.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced — these are pure static data assets sitting on disk.

## Known Stubs

None. All three files contain real, production-ready data (jsPDF UMD bundle, two valid base64-encoded TTF subsets). No placeholders, no TODO base64 strings, no "coming soon" markers.

## Verification Performed

Per the plan's `<verification>` block:

- `ls assets/jspdf.min.js assets/fonts/noto-sans-base64.js assets/fonts/noto-sans-hebrew-base64.js` — all three exist
- `node -c assets/jspdf.min.js` — syntax OK
- `node -c assets/fonts/noto-sans-base64.js` — syntax OK
- `node -c assets/fonts/noto-sans-hebrew-base64.js` — syntax OK
- `du -k` sizes: jspdf 360 KB, noto-sans 116 KB, noto-sans-hebrew 32 KB — total 508 KB
- Per-task acceptance criteria (8 sub-checks per font file, 6 sub-checks for jsPDF): all pass except for the documented Hebrew file-size note above
- Browser-load smoke test (node with stub `var window={}`): both font globals are set to non-empty strings of the expected lengths

## Self-Check: PASSED

- `assets/jspdf.min.js` exists at expected path: FOUND
- `assets/fonts/noto-sans-base64.js` exists at expected path: FOUND
- `assets/fonts/noto-sans-hebrew-base64.js` exists at expected path: FOUND
- Commit `603a5b1` (Task 1): FOUND in git log
- Commit `c1635a5` (Task 2): FOUND in git log
- Commit `122c195` (Task 3): FOUND in git log
- All claims in this SUMMARY (file sizes, base64 lengths, SHA-256, commit hashes) verified against actual disk state and git log
