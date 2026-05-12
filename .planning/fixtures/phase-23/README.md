# Phase 23 PDF regression fixtures (Latin + Hebrew)

This directory (`.planning/fixtures/phase-23/`) holds the test fixtures and baseline hashes
for the Phase 23 Latin-only PDF regression smoke test. The harness is
`tests/pdf-latin-regression.test.js` at the repo root.

## Purpose

Phase 23 rewrote the bidi pipeline (`shapeForJsPdf`, Plan 23-02) and the page layout (margins
+ centered title block, Plan 23-03) inside `assets/pdf-export.js`. EN/DE/CS-only sessions are
expected to render identically every time after Phase 23 ships — the bidi pre-shape returns
Latin input byte-identical, so the only intentional changes for Latin output are the layout
(margins/centering) ones.

These hash files lock in the post-rewrite baseline. Any Phase 24+ change that perturbs the
EN/DE/CS PDF output will fail the regression check, forcing the developer to either
(a) revert the unintended change or (b) regenerate the baselines with explicit justification.

This closes UAT statement T3 ("EN/DE/CS-only sessions produce byte-similar PDFs to
pre-Phase-23 output") on the **post-rewrite** baseline, per RESEARCH 'Latin-only Regression
Strategy' Open Question #3 (locked at planning time — see plan 23-04 frontmatter).

## What's here

| File | Purpose |
| --- | --- |
| `fixture-en.json`        | English fixture: client "Anna M.", ~2-page session note, ASCII Latin only. |
| `fixture-de.json`        | German fixture: client "Jörg Müller", umlauts (ä/ö/ü/ß) sprinkled across body. |
| `fixture-cs.json`        | Czech fixture: client "Pavel Novák", Czech diacritics (š/č/ř/ě/ý/ů). |
| `fixture-he.json`        | Hebrew fixture: client "דנה כהן", ~2-page RTL session note covering pure-Hebrew heading, paragraph, list, Hebrew+Latin mix, ISO date, and parens (UAX-BD16 mirrors). Added by 23-06 to cover the RTL rendering path that the 3 Latin fixtures structurally cannot hit (`isRtl()` is false on Latin → LTR branch). |
| `fixture-en.pdf.sha256`  | 64-char lowercase-hex SHA-256 of the PDF the harness builds for fixture-en. |
| `fixture-de.pdf.sha256`  | Same, for fixture-de. |
| `fixture-cs.pdf.sha256`  | Same, for fixture-cs. |
| `fixture-he.pdf.sha256`  | Same, for fixture-he (RTL Hebrew baseline). |
| `README.md`              | This file. |

## How the hashes were generated

- **Harness:** `tests/pdf-latin-regression.test.js` at the repo root.
- **Mitigation used: B** (executor-confirmed at task start during the 5-minute spike).
  The harness pins two non-deterministic PDF fields by monkey-patching the jsPDF constructor
  inside the JSDOM window so every newly-created `doc` immediately receives:
  - `doc.setCreationDate("D:20260101000000+00'00'")` — pins `/CreationDate`.
  - `doc.setFileId("00000000000000000000000000000000")` — pins `/ID`.

  Both pins are required. The executor's spike showed that pinning `/CreationDate` alone
  is not enough — jsPDF generates a fresh 16-byte file identifier on every `output()` call
  unless `setFileId` is also called. With both pins applied, two back-to-back PDF outputs
  hash identically.

  Mitigation B is harness-only — the production `assets/pdf-export.js` is unmodified.

  Mitigation A (compute SHA-256 over PDF bytes with `/CreationDate` and `/ID` byte-ranges
  masked) is the documented fallback if Mitigation B ever stops working in a future jsPDF
  version. It was NOT used here.

- **Pinned creationDate value:** `D:20260101000000+00'00'` (2026-01-01 00:00:00 UTC).
- **Pinned file ID value:** `00000000000000000000000000000000` (32 zero hex chars; valid
  per the PDF spec).
- **Library versions at capture time:**
  - jsPDF 2.5.2 (`assets/jspdf.min.js`, vendored 2026-05-06).
  - bidi-js 1.0.3 (`assets/bidi.min.js`, vendored by Plan 23-01 on 2026-05-12).
  - Heebo Regular v3.100 unified Hebrew+Latin font (`assets/fonts/heebo-base64.js`,
    vendored 2026-05-12 by Plan 23-07; replaced the prior single-script NotoSans +
    NotoSansHebrew fonts that silently dropped glyphs on mixed-script lines).
- **JSDOM resolution:** the harness loads jsdom from `/tmp/node_modules/jsdom`. To set up,
  run `mkdir -p /tmp && cd /tmp && npm install jsdom` once (jsdom is NOT installed inside
  this project's tree to avoid polluting it with a `package.json` for what is currently a
  vanilla-JS / no-build-step project). Override the path with `JSDOM_PATH=...` if needed.
- **Date captured:** 2026-05-12 (Phase 23 wave-3 execution session).

## The regeneration protocol

The baseline hashes WILL legitimately change any time the PDF output legitimately changes.
The most common triggers are:

- A modification to `assets/pdf-export.js` (layout, fonts, helpers, anything).
- A new vendored version of jsPDF / bidi-js / Noto fonts.
- A change to one of the fixture JSONs in this directory.

When that happens, the developer who made the legitimate change MUST follow this protocol:

1. **Run** `node tests/pdf-latin-regression.test.js --regenerate` from the repo root.
   This overwrites the three `.sha256` files with the new outputs.
2. **Eyeball the resulting PDFs** to confirm they look correct. The harness only writes
   the hashes — it does NOT save the PDFs. To save them for visual inspection, temporarily
   patch the harness or run the equivalent flow through the in-app export.
3. **Commit the new `.sha256` files** with a commit message that names the legitimate change.
   Example:
   ```
   test(NN-MM): regen Latin-regression baselines after font upgrade
   ```
4. **NEVER commit regenerated hashes blindly.** Every regeneration must have a corresponding
   intentional change in another commit on the same branch.

If a Phase 24+ change unexpectedly fails the regression check, that's the smoke alarm —
investigate the layout/text/font cause before regenerating. The hashes are gates, not data.

## Phase 23 plan IDs

This regression suite was landed by **Plan 23-04** as the closer for UAT statement T3.
Other plans in Phase 23:

- **Plan 23-01** — vendored bidi-js@1.0.3 into `assets/bidi.min.js`.
- **Plan 23-02** — added the `shapeForJsPdf` bidi pre-shape pipeline + removed `setR2L` calls.
- **Plan 23-03** — A4 71pt margins + centered title block on page 1.
- **Plan 23-04** — this regression suite + `tests/pdf-bidi.test.js` algorithmic corpus.
- **Plan 23-05** (optional) — footer-centering refactor.
- **Plan 23-06** — RTL anchor fix (`align: 'right'` on the 4 RTL `doc.text` sites in `assets/pdf-export.js`) + this Hebrew fixture, closing the verification gap that let the 23-02 setR2L removal ship a broken RTL anchor.
- **Plan 23-07** — hot-fix: vendored Heebo Regular as a unified Hebrew+Latin font, replacing the two prior single-script Noto fonts (which silently dropped glyphs on mixed Hebrew+Latin lines). Added `tests/pdf-glyph-coverage.test.js` as a glyph-emission floor regression that would have caught the bug; regenerated all 4 fixture .sha256 baselines for the new font.
