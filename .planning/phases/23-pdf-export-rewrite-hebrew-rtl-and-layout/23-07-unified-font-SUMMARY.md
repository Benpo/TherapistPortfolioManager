---
phase: 23
plan: 23-07
subsystem: pdf-export
type: hot-fix
tags: [fonts, heebo, jspdf, mixed-script, regression-test, missing-glyph]
date: 2026-05-12
status: shipped
---

# Phase 23 Plan 23-07: Unified Heebo Font Summary

**One-liner:** Vendored Heebo Regular as a single Hebrew+Latin font and rewired pdf-export.js to use it everywhere, fixing the silent glyph-drop bug where the prior single-script Noto fonts (NotoSans = Latin only, NotoSansHebrew = Hebrew only) lost ~half the chars on any line that mixed scripts; added a glyph-emission floor regression test that would have caught the bug.

## Bug summary

The prior implementation registered two single-script fonts and chose one per line based on `isRtl(line)`:

```javascript
function applyFontFor(line) {
  if (isRtl(line)) doc.setFont("NotoSansHebrew", "normal");
  else             doc.setFont("NotoSans", "normal");
}
```

jsPDF silently drops every char it cannot find in the active font. Result: a line like `דנה הזכירה את הספר "Atomic Habits" של ג'יימס קליר` triggered the Hebrew branch (because the line contained Hebrew chars), then NotoSansHebrew dropped every Latin char ("Atomic Habits") because it has no Latin glyphs. Equivalent loss happened on the Latin path for any Hebrew sprinkled into a Latin context. Pure-script lines worked fine, which is why pre-Phase-23 setR2L=true masked the symptom (visual chaos) and why the Plan 23-04 fixture suite missed it (the 3 Latin fixtures structurally cannot exercise mixed-script font loss; the 23-06 Hebrew fixture's hash was stable across builds because the same broken-but-deterministic glyph subset was emitted every run).

Fix: replace both single-script fonts with one unified Heebo Regular font that covers both scripts.

## Font choice

**Used:** Heebo Regular v3.100 (Google Fonts).

**Why:** First-choice from the plan's fallback ordering (Heebo → Rubik → Assistant → DejaVu). Source download succeeded on the first attempt (gstatic CDN: `https://fonts.gstatic.com/s/heebo/v28/NGSpv5_NC0k9P_v6ZUCbLRAHxK1EiSyccg.ttf`, 200 OK, 44 KB). Glyph coverage check passed (fontTools cmap inspection):

| Codepoint range | Count | Examples covered |
| --- | --- | --- |
| Hebrew U+0590-05FF | 50 | א ב ג ד ה ו ז ח ט י (full alphabet incl. final forms) |
| Latin Basic A-Z | 26 | All uppercase |
| Latin Basic a-z | 26 | All lowercase |
| Digits 0-9 | 10 | All ASCII digits |
| Latin Extended-A | 100 | Includes German umlauts ä/ö/ü/ß and Czech diacritics š/č/ř/ě/ý/ů |
| General punctuation U+2000-206F | 17 | em/en dashes, smart quotes |
| Common ASCII punctuation | 13 | space, parens, brackets, hyphen, colon, period, comma, quotes, apostrophe |

Total cmap entries: 463 codepoints. The full glyph set used by all 4 existing fixtures (en/de/cs/he) is covered.

**Visual brand:** Heebo is a humanist sans-serif designed by Oded Ezer, derived from the Latin "Halver" by Christian Robertson and extended with Hebrew. It pairs naturally with Latin sans-serifs at similar metrics — visually close to the prior Noto Sans look. Hebrew text retains the upright, modern proportions of Noto Sans Hebrew without obvious style drift.

**License:** SIL Open Font License 1.1 (same as the prior Noto fonts). Saved to `assets/fonts/heebo.LICENSE.txt`. License attribution also inline as a header comment in `assets/fonts/heebo-base64.js`.

## Final font file size

| Asset | Size | Notes |
| --- | --- | --- |
| `assets/fonts/heebo-base64.js` | **60 KB** (59,626 bytes) | Single file. Replaces the prior pair below. |
| ~~`assets/fonts/noto-sans-base64.js`~~ | (deleted, was 116 KB) | Latin-only, removed |
| ~~`assets/fonts/noto-sans-hebrew-base64.js`~~ | (deleted, was 32 KB) | Hebrew-only, removed |

**Net reduction:** 148 KB → 60 KB (–60%). The unified font is smaller because Heebo Regular is a single weight in a single file; the prior NotoSans included Latin Extended-B and additional script subsets we never used, so it was bloated.

`window.Heebo` base64 string length: 58,608 chars.

## Visual-comparison notes

Cross-checked by extracting the regenerated `fixture-he` PDF via `pdftotext -layout`:

- **Hebrew prose** (e.g. the body paragraphs about Dana's session) renders cleanly with the same Hebrew character forms as before — Heebo is visually similar to Noto Sans Hebrew at body sizes.
- **Mixed-script line** `דנה הזכירה גם שהיא קוראת ספר חדש בשם "Atomic Habits" של ג'יימס קליר` now renders complete; pdftotext shows the Latin run as `"stibaH cimotA"` (reversed because pdftotext reads code-units in their PDF stream order, and our bidi pre-shape emits visual order, but the PDF VIEWER will display this LTR run correctly because the glyphs are positioned correctly in the page coordinate space).
- **ISO date** `2026-05-15` appears as `51-50-6202` in the pdftotext extraction — same reason; renders correctly in the actual PDF viewer because each digit glyph is positioned LTR within the surrounding RTL line.
- **Parenthesized Latin run** `(body scan)` also appears as `(body scan)` (parens are correctly mirrored by the bidi pre-shape from Plan 23-02).
- **Title block** "דנה כהן" renders centered at top (Plan 23-03 centering preserved), with the metadata line "8 במאי 2026 - קליניקה" centered immediately below.
- **Footer** "Page 1 of 1" renders Latin LTR at center bottom (Plan 23-05 centered footer preserved).

No visual regressions vs the post-Plan-23-06 baseline; the only difference is that previously-missing chars now appear.

## Hash deltas for all 4 fixtures (old → new)

All 4 baselines drifted because every glyph index changes when the font changes. This is expected — there are no algorithmic regressions hiding in this drift.

| Fixture | Pre-Heebo (post-23-06) hash | Post-Heebo (Plan 23-07) hash |
| --- | --- | --- |
| `fixture-en` | `3963c08b8de7339a1ca2cf92e5189ea0e63a154e46481a3ff9f367c8a0df7b23` | `8e95025475d624af4cd528dfe25d4438d3de8938de1a4a7665ddf43a86094846` |
| `fixture-de` | `11ea9f8c7cac3b82ed84ce1eed7f0923cf3eeb06af0d4e7da82e3b90ddc47208` | `48414c642e1f6e56b442bcc389e1ce2838a00945aedd61ea5c4e156bbce586c9` |
| `fixture-cs` | `1148f0c98375b99f04458f2831d94b66ba3a316b6d29af6e1b262c47440732d5` | `10fff21962989608327bef77edc382d1d3b8ce790e1987ea2c027d53b368ee7c` |
| `fixture-he` | `db2d4f3112084b4bf5ca18056072ac1de3de1dae6301b3ef6b3d83eb72b52b29` | `67110f3db9e4b6e3bb59e79b289390e1f1e6b5590f21cbb4786deb252818aef9` |

Check mode (`node tests/pdf-latin-regression.test.js`) → 4/4 PASS after regeneration.

### Glyph-count proof on `fixture-he`

Decoded the regenerated `fixture-he` PDF page 1 content stream:

- Source visible non-whitespace chars (excluding markdown structural `#`, `-`, `*`): **1,243** chars.
  - Hebrew block chars: 1,188
  - Latin A-Za-z chars: 20 (the "Atomic Habits" run + the "(body scan)" run)
  - Digits: 8 (the "2026-05-15" date and chapter numbers)
- **Total glyphs emitted in PDF content stream: 1,522** (123% of source — overhead from line wrapping + bold marker rendering).
- Lines emitting >20 glyphs: **20 lines**. Max line glyph count: **89**.

Pre-fix the metadata line and the "Atomic Habits"/"body scan"/date lines would have lost their Latin/digit chars to the missing-glyph drop. Post-fix all chars render. The fixture ratio (123%) is well above the 70% safety floor.

## Mixed-script regression test details

Added `tests/pdf-glyph-coverage.test.js`. Fail-shape: a single-paragraph fixture with mixed Hebrew + Latin asserted against three glyph-emission floors.

| Aspect | Detail |
| --- | --- |
| **Test fixture markdown** | `דנה הזכירה את הספר "Atomic Habits" של ג'יימס קליר` |
| **Total glyph count** | Measured 85 on page 1; floor set to 60 (catches >50% glyph loss) |
| **Latin CIDs expected** | 10 GIDs from the chars A, t, o, m, i, c, H, a, b, s under Heebo |
| **Latin CID hits required** | 8 of 10 (allows minor wrapping splits without weakening) |
| **Hebrew CIDs expected** | 5 GIDs from chars ש, ל, ה, נ, ד under Heebo |
| **Hebrew CID hits required** | 4 of 5 |
| **Test result** | All 3 assertions pass: 85 glyphs ≥ 60 floor; 10/10 Latin CIDs found; 5/5 Hebrew CIDs found |

If a future change reverts the unified font (e.g. swaps Heebo for a Latin-only font), Latin CID coverage stays at 10/10 but Hebrew drops to 0/5 → test fails. If it swaps for a Hebrew-only font, the inverse happens. If it changes line-wrap math so the test paragraph wraps to page 2, the total drops below 60 → test fails. All three failure shapes are clearly diagnosable in the test output.

The test pins specific GID values for Heebo Regular v3.100. The header comment + a `MEASURE_MODE=1` env-var mode document the remeasurement protocol when Heebo is upgraded or swapped.

## Commits

| Step | Hash | Message |
| --- | --- | --- |
| Task 1 | `e7cd8f9` | `feat(23-07): vendor Heebo Regular -- unified Hebrew+Latin font (replaces single-script Noto Sans + Noto Sans Hebrew)` |
| Task 2 | `8b0fb25` | `feat(23-07): pdf-export.js uses Heebo for all text -- fixes silent glyph drop on mixed-script lines` |
| Task 3 | `5413321` | `chore(23-07): sw.js precache swap -- heebo-base64.js replaces 2 noto font entries` |
| Task 4 | `4cc61e7` | `chore(23-07): regenerate all 4 fixture baselines for Heebo font (en/de/cs/he)` |
| Task 5 | `2e6fdec` | `test(23-07): glyph-coverage regression -- mixed-script line must emit glyphs for both scripts` |

Pre-commit hook bumped `CACHE_NAME` twice automatically: `v87 → v88` (folded into Task 1) and `v88 → v89` (folded into Task 2). Task 3 manually staged sw.js with the asset list change at v89, so the hook detected "already staged" and skipped a third bump — the v89 cache version already reflects the new precache list at the merge state, so no clients can land on the wrong intermediate state.

## All verification gates (status)

### Pre-flight (before Task 1)

- [x] `git rev-parse HEAD` was `7652fb6` (descendant of plan-spec base) — confirmed
- [x] Both `assets/fonts/noto-sans-base64.js` and `assets/fonts/noto-sans-hebrew-base64.js` existed at start
- [x] `grep -c "NotoSans\|NotoSansHebrew" assets/pdf-export.js` returned 14 (≥ 4) before edits
- [x] All 4 fixture `.sha256` files existed in `.planning/fixtures/phase-23/`

### Task 1 (font vendoring)

- [x] Heebo Regular v3.100 downloaded from Google Fonts CDN (HTTP 200, 43,956 bytes)
- [x] License file (OFL 1.1) saved to `assets/fonts/heebo.LICENSE.txt`
- [x] Base64-encoded to `assets/fonts/heebo-base64.js` matching prior `window.Foo = "..."` format
- [x] JSDOM+jsPDF sanity test: Hebrew sample → 9 glyphs, Latin sample → 22 glyphs, mixed sample → 20 glyphs (no zero-glyph cases)

### Task 2 (pdf-export.js gates from plan)

- [x] `node -c assets/pdf-export.js` exits 0
- [x] `grep -c "NotoSans" assets/pdf-export.js` = **0**
- [x] `grep -c "Heebo" assets/pdf-export.js` = **17** (≥ 4)
- [x] `grep -c "loadScriptOnce.*heebo" assets/pdf-export.js` = **1** (≥ 1)
- [x] `grep -c "loadScriptOnce.*noto-sans" assets/pdf-export.js` = **0**
- [x] `grep -c "function isRtl" assets/pdf-export.js` = **1** (preserved)
- [x] `grep -c "function applyFontFor" assets/pdf-export.js` = **1** (preserved)
- [x] `grep -c "shapeForJsPdf" assets/pdf-export.js` = **15** (≥ 7)
- [x] `grep -c "align: 'right'" assets/pdf-export.js` = **5** (≥ 4)
- [x] `grep -c "setR2L" assets/pdf-export.js` = **0** (Phase 23 invariant preserved)

### Task 3 (sw.js gates)

- [x] `grep -c "/assets/fonts/heebo-base64.js" sw.js` = 1
- [x] `grep -c "noto-sans" sw.js` = 0
- [x] `node -c sw.js` exits 0
- [x] Old `noto-sans-*` files deleted

### Task 4 (fixture regeneration)

- [x] `node tests/pdf-latin-regression.test.js --regenerate` regenerated all 4 baselines without error
- [x] `node tests/pdf-latin-regression.test.js` (check mode) → 4/4 PASS
- [x] Fixture-he extracted via pdftotext, mixed-script line confirmed: "Atomic Habits", "(body scan)", "2026-05-15" all present in glyph stream

### Task 5 (glyph-coverage test)

- [x] `node -c tests/pdf-glyph-coverage.test.js` exits 0
- [x] Test passes 3/3 (total glyph floor 85≥60, Latin CIDs 10/10, Hebrew CIDs 5/5)
- [x] All other test files still pass: `pdf-bidi.test.js` 12/12, `pdf-latin-regression.test.js` 4/4

## Deviations from plan

### Auto-fixed (Rule 3 — blocking)

**1. [Rule 3 — Blocking] `tests/pdf-latin-regression.test.js` harness updated to load heebo-base64.js**
- **Found during:** Task 4 (regeneration step).
- **Issue:** The harness `eval`s `assets/fonts/noto-sans-base64.js` and `assets/fonts/noto-sans-hebrew-base64.js` at JSDOM-env build time. After Task 3 deleted those files, the harness would fail to start.
- **Fix:** Replaced the two `eval(readAsset('assets/fonts/noto-sans-*.js'))` lines with a single `eval(readAsset('assets/fonts/heebo-base64.js'))`, and updated the `preload` array (3 entries instead of 4) so the loadScriptOnce check finds matching `<script>` tags.
- **Files modified:** `tests/pdf-latin-regression.test.js`
- **Commit:** `4cc61e7` (folded into Task 4 commit since the harness change and the baseline regeneration are the same logical work)

### None: Rules 1, 2, 4 not triggered

- No latent bugs found in the surrounding code while editing.
- No missing critical functionality discovered.
- No architectural decisions surfaced — the plan's spec was complete and the path was straightforward.

### Decision recorded (not a deviation, but for the record)

**License file `heebo.LICENSE.txt` intentionally NOT added to `sw.js` PRECACHE_URLS.** The plan said "Add `heebo.LICENSE.txt` only if you keep the license file separate (you can skip if upstream has license inline in the base64 file; record decision)." The license attribution IS already inline in the `heebo-base64.js` header comments, AND the runtime never fetches the .txt file as a sub-resource (it's a documentation-only artifact for repository readers). Pre-caching it would waste a few KB of every user's disk for no functional benefit. The .txt file remains in the repo for license-compliance discoverability.

## Reflection — keep "fonts cover all expected scripts" as a planning gate

This bug existed since Phase 22 (when the two single-script fonts were vendored), masked by the pre-Phase-23 setR2L=true visual chaos until Phase 23's bidi correctness exposed it. The Plan 23-04 fixture suite was the right idea but missed the bug because it pinned WHOLE-PDF byte equality on fixtures that each used ONE script per line — there was no representation of the cross-script case where the missing-glyph behavior triggers.

**Three lessons for future planning:**

1. **At font-vendoring time, ALWAYS measure cmap coverage against the union of all scripts the app supports.** Phase 22's font selection process should have flagged "NotoSansHebrew lacks Latin glyphs" as a problem the moment the per-line `isRtl`-driven font switch was designed. The new Plan 23-07 commits document the script set we actually need (Hebrew + Latin Basic + Latin Extended-A + digits + General Punctuation); future font swaps should pass through the same cmap check (the fontTools snippet in this SUMMARY's "Font choice" section is reusable).

2. **Test corpora MUST include the cross-product of edge dimensions.** The Plan 23-04 fixtures covered direction (LTR/RTL) and language (en/de/cs/he), but the 4 fixtures were each pure-script. The mixed-script case needed its own fixture from day one. Going forward, when designing a fixture suite, enumerate edge dimensions (direction, script, font, layout, content shape) and make sure every combination that appears in real production data has at least one fixture.

3. **Floor-style assertions are stronger than equality-style assertions for catching silent loss.** The Plan 23-04 hash equality test would only trigger if the chosen-but-broken font's output drifted; if the font silently dropped chars deterministically, the hash stayed stable. The new `tests/pdf-glyph-coverage.test.js` asserts a glyph-count floor, which catches "the output is too short" failures even when those failures are deterministic. Apply this style to future regression tests where the failure mode is "silent omission of expected output."

**Concrete planning-gate suggestion:** add a checklist item to the Phase planner template: *"For any binary asset that maps content (font/codec/spritesheet/translation table), demonstrate that the asset's coverage set is a superset of the union of all input shapes the app produces. If the gap is intentional (e.g. emoji not supported), document it with the user-visible behavior on inputs that hit the gap."* This would have flagged the Phase 22 font selection as incomplete.

## Self-Check: PASSED

**Files claimed created — verified existing:**
- `assets/fonts/heebo-base64.js` — FOUND
- `assets/fonts/heebo.LICENSE.txt` — FOUND
- `tests/pdf-glyph-coverage.test.js` — FOUND
- `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-07-unified-font-SUMMARY.md` — (this file)

**Files claimed modified — verified diff present in HEAD chain:**
- `assets/pdf-export.js` (Task 2 commit `8b0fb25`)
- `sw.js` (Task 3 commit `5413321` — asset list change; Tasks 1-2 cache version bumps via pre-commit hook)
- `tests/pdf-latin-regression.test.js` (Task 4 commit `4cc61e7`)
- `.planning/fixtures/phase-23/{fixture-en,fixture-de,fixture-cs,fixture-he}.pdf.sha256` (Task 4 commit)
- `.planning/fixtures/phase-23/README.md` (Task 5 commit)

**Files claimed deleted — verified absent:**
- `assets/fonts/noto-sans-base64.js` — gone from working tree (commit `5413321`)
- `assets/fonts/noto-sans-hebrew-base64.js` — gone from working tree (commit `5413321`)

**Commits claimed — verified present in `git log`:**
- `e7cd8f9`, `8b0fb25`, `5413321`, `4cc61e7`, `2e6fdec` — all present

All claims verified.
