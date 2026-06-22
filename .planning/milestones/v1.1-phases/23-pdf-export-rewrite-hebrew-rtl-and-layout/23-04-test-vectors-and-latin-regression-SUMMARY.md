---
phase: 23-pdf-export-rewrite-hebrew-rtl-and-layout
plan: 23-04
parent_phase: 23
title: Bidi test-vector corpus + Latin-regression smoke fixtures — SUMMARY
type: summary
wave: 3
status: shipped
requirements:
  - 23-T1
  - 23-T2
  - 23-T3
tags:
  - phase-23
  - pdf
  - testing
  - regression
  - fixtures
  - bidi
  - latin-regression
  - jsdom
  - jspdf
commits:
  - hash: 74c068a
    type: test
    message: 12-vector bidi correctness corpus (tests/pdf-bidi.test.js)
  - hash: 69df008
    type: test
    message: Latin-regression harness + 3 fixtures + baseline hashes (T3 closed)
files_created:
  - tests/pdf-bidi.test.js
  - tests/pdf-latin-regression.test.js
  - .planning/fixtures/phase-23/fixture-en.json
  - .planning/fixtures/phase-23/fixture-de.json
  - .planning/fixtures/phase-23/fixture-cs.json
  - .planning/fixtures/phase-23/fixture-en.pdf.sha256
  - .planning/fixtures/phase-23/fixture-de.pdf.sha256
  - .planning/fixtures/phase-23/fixture-cs.pdf.sha256
  - .planning/fixtures/phase-23/README.md
files_modified: []
metrics:
  bidi_vectors_total: 12
  bidi_vectors_passing: 12
  bidi_vectors_first_shot_pass: 12
  fixture_count: 3
  fixture_languages: en/de/cs
  baseline_hash_byte_length: 65
  mitigation_chosen: B
  mitigation_pins_required: 2
  jsdom_install_option: 1
  jsdom_resolved_path: /tmp/node_modules/jsdom
  jsdom_version: 29.1.1
  jspdf_version: 2.5.2
  bidi_js_version: 1.0.3
  pinned_creation_date: D:20260101000000+00'00'
  pinned_file_id: '00000000000000000000000000000000'
  task1_lines_added: 172
  task2_lines_added: 387
  total_lines_added: 559
  spike_iterations: 5
  automated_gates_passed: 24
  production_code_modified: false
  pre_commit_hook_fired_unexpectedly: false
baseline_hashes:
  fixture-en.pdf: 771db4ba0f002826d173d7cd23860ae59bf93a72c8a7143b6469feeec6694de0
  fixture-de.pdf: 96ba1e3d198ed8257b98c8f65ebfb263d9ae2ae78e189da4a601834620c4992c
  fixture-cs.pdf: 6f74fc1b3de7783f8a6d8eccbb388b90082630aa00101399275f092ecbafb1f7
---

# Phase 23 Plan 04: Bidi test-vector corpus + Latin-regression smoke fixtures — SUMMARY

**One-liner:** Landed two pieces of automated verification scaffolding for Phase 23 — a 12-vector bidi correctness corpus (`tests/pdf-bidi.test.js`, all 12 RESEARCH vectors green first-shot against the live `assets/bidi.min.js`) and a JSDOM-based Latin-regression harness (`tests/pdf-latin-regression.test.js`) that pins both `/CreationDate` AND `/ID` in jsPDF output to produce byte-deterministic SHA-256 baselines for 3 EN/DE/CS fixture sessions. Closes UAT statement T3 on the post-rewrite Phase 23 baseline. Production code (`assets/pdf-export.js`, `sw.js`, `assets/bidi.min.js`) untouched.

## Performance

- **Started:** 2026-05-11T22:42:00Z (approx — task began immediately after pre-flight checks)
- **Completed:** 2026-05-11T22:52:31Z
- **Duration:** ~10 min (including 5 jsPDF determinism-spike iterations)
- **Tasks:** 2/2 (both fully autonomous, no checkpoints)
- **Files created:** 9
- **Files modified:** 0 (production code unchanged)
- **Commits:** 2 atomic + 1 SUMMARY (this file)

## Accomplishments

- **`tests/pdf-bidi.test.js`** — Standalone Node test (no framework) covering all 12 RESEARCH "Test Vector Corpus" cases. Self-contained: loads `assets/bidi.min.js` into a `vm` sandbox with `window`+`self` UMD shims (per G14 from 23-02) and inlines `firstStrongDir` + `shapeForJsPdf` verbatim from `assets/pdf-export.js` L214–252. **All 12 vectors passed first-shot.** No helper-implementation drift was needed — the inline copy hashed identical-output to the production helper on every vector, including #11 (Hebrew + emoji surrogate pair, the G2 surrogate-safety canary) and #4 (mirrored brackets, G3 UAX-BD16).
- **`tests/pdf-latin-regression.test.js`** — JSDOM-based regression harness that builds a real PDF for each of 3 fixture sessions via `window.PDFExport.buildSessionPDF`, SHA-256s the bytes, and compares against the committed baseline. Supports a `--regenerate` flag for legitimate baseline-update workflow.
- **3 fixture JSONs** (`fixture-en.json`, `fixture-de.json`, `fixture-cs.json`) — Each ~2-page therapist session note with heading + 3-item list + paragraph spanning a page break, matching the `{ sessionData, opts }` shape from `pdf-export.js` JSDoc L371–378. Distinctive content: "Anna M.", "Jörg Müller" (umlauts), "Pavel Novák" (Czech diacritics).
- **3 baseline SHA-256 hashes** captured against post-23-02 + post-23-03 PDF output. Each hash file is exactly 65 bytes (64 lowercase hex chars + newline) per the plan spec.
- **`.planning/fixtures/phase-23/README.md`** documents purpose, the chosen mitigation, the regeneration protocol, library versions, and Phase 23 plan IDs.
- **All 24 automated gates** across both tasks passed (8 gates for Task 1 + 16 gates for Task 2).

## Task Commits

1. **Task 1: 12-vector bidi correctness corpus** — `74c068a` (test)
2. **Task 2: Latin-regression harness + 3 fixtures + baseline hashes** — `69df008` (test)

## Files Created

- `tests/pdf-bidi.test.js` — 172 lines. 12-vector bidi correctness corpus.
- `tests/pdf-latin-regression.test.js` — 247 lines. JSDOM-based deterministic-PDF + SHA-256 harness.
- `.planning/fixtures/phase-23/fixture-en.json` — English fixture (Anna M., Clinic, ~1801 markdown chars).
- `.planning/fixtures/phase-23/fixture-de.json` — German fixture (Jörg Müller, Online, ~2031 markdown chars, raw UTF-8 umlauts).
- `.planning/fixtures/phase-23/fixture-cs.json` — Czech fixture (Pavel Novák, Other, ~1810 markdown chars, raw UTF-8 diacritics).
- `.planning/fixtures/phase-23/fixture-en.pdf.sha256` — `771db4ba0f002826d173d7cd23860ae59bf93a72c8a7143b6469feeec6694de0`.
- `.planning/fixtures/phase-23/fixture-de.pdf.sha256` — `96ba1e3d198ed8257b98c8f65ebfb263d9ae2ae78e189da4a601834620c4992c`.
- `.planning/fixtures/phase-23/fixture-cs.pdf.sha256` — `6f74fc1b3de7783f8a6d8eccbb388b90082630aa00101399275f092ecbafb1f7`.
- `.planning/fixtures/phase-23/README.md` — 104 lines. Purpose, mitigation, regeneration protocol, plan IDs.

## Files Modified

**None.** Production code (`assets/pdf-export.js`, `sw.js`, `assets/bidi.min.js`) was not touched. The pre-commit hook (which auto-bumps `sw.js` CACHE_NAME when `assets/*` changes) did NOT fire on either commit, as expected.

## Mitigation chosen and the spike that proved it (Step A finding)

**Mitigation B was chosen — but it requires pinning TWO fields, not one.** The 5-minute spike at task start uncovered a meaningful gotcha not anticipated by the plan:

- **Spike #1** (the literal plan-prescribed approach): `doc.setProperties({ creationDate: new Date(...) })` does **NOT** pin the bytes. jsPDF 2.5.2 silently ignores the `creationDate` key inside `setProperties` and continues to use `new Date()` at output time. Two back-to-back PDFs differed by exactly the seconds-of-day in `/CreationDate`.
- **Spike #2:** `doc.setCreationDate(new Date(...))` (jsPDF's actual API) threw `Invalid argument passed to jsPDF.setCreationDate` because the Node `Date` object failed jsPDF's `instanceof Date` check (jsPDF compares against the JSDOM-window's `Date` constructor, not Node's globalThis.Date).
- **Spike #3:** `doc.setCreationDate("D:20260101000000+00'00'")` (pre-formatted PDF date string per jsPDF's accepted regex `/^D:(20[0-2][0-9]|...)/`) **DID** pin `/CreationDate` to the exact intended bytes — but the SHA-256s STILL differed.
- **Spike #4 (byte-diff):** A four-region byte diff between two pin-attempt-1 outputs revealed the second non-determinism source: jsPDF's PDF trailer `/ID [ <hex> <hex> ]` field, generated freshly on every `output()` call from randomness + timestamp.
- **Spike #5 (final):** `doc.setCreationDate(PINNED_DATE)` + `doc.setFileId('00000000000000000000000000000000')` produced byte-identical SHA-256s on back-to-back runs (`c005f862...`). Determinism confirmed.

The harness applies BOTH pins via a `jsPDF` constructor monkey-patch inside the JSDOM window so every `new jsPDF()` call automatically receives them before the harness consumes the output. This is harness-only — production `pdf-export.js` is unmodified. Mitigation A (byte-mask) was kept as a documented fallback in the README but was not needed.

## JSDOM install path (Option 1, with a twist)

The orchestrator listed three options for handling the absence of JSDOM in the no-`package.json` project. **Option 1 was chosen and worked** — but with an unexpected resolution path:

- Attempted: `npm install --prefix /tmp/jsdom-sandbox jsdom`.
- What npm actually did: walked up to a pre-existing `/tmp/package.json` (which `npm install` always prefers over `--prefix` when one exists in a parent directory) and installed jsdom into `/tmp/node_modules/jsdom`. The `/tmp/jsdom-sandbox/node_modules` directory was never created.
- The harness now requires `/tmp/node_modules/jsdom` (jsdom **29.1.1**), not `/tmp/jsdom-sandbox/...`. The exact path is documented in the harness header AND in the README. `JSDOM_PATH=/path/...` env override is supported for portability.
- **Project tree stayed clean:** no `package.json`, no `package-lock.json`, no `node_modules/` added to the repo. This was Option 1's main appeal and was preserved.

## Bidi corpus first-shot pass — no helper drift

All 12 vectors passed on the first run with no helper debugging or implementation drift. The inline `shapeForJsPdf` (lines 84–103 of `tests/pdf-bidi.test.js`) is a verbatim copy of `assets/pdf-export.js` L235–252, and the inline `firstStrongDir` (lines 75–82) is a verbatim copy of L214–222. The `vm` sandbox loader pattern from G14 (23-02 SUMMARY) — `vm.createContext({ window, self, module: undefined, exports: undefined, define: undefined })` with `self.self = self` and `window.window = window` — worked first-shot to force the bidi-js UMD detection past the CommonJS branch and onto the global-attach branch. Loader pattern is documented at the top of the test file.

## Decisions Made

- **Mitigation B with both `/CreationDate` AND `/ID` pinned** — discovered during Step A spike. The plan only anticipated one pin; the spike revealed two. Both pins applied via a single jsPDF constructor monkey-patch.
- **JSDOM at `/tmp/node_modules/jsdom`** — Option 1 from the orchestrator brief. Project tree remained `package.json`-free.
- **Hash-only baseline** — the harness writes only the SHA-256 .sha256 files, not the PDFs themselves. Visual eyeball verification is delegated to the manual UAT path Sapir/Ben will run after Wave 3 completes (per the regeneration-protocol section in the README).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Plan-prescribed `Array.from(text)` mention in test-file header tripped the strict literal-grep gate**

- **Found during:** Task 1 verification.
- **Issue:** The plan-required header comment for `tests/pdf-bidi.test.js` said `"shapeForJsPdf MUST use text.split('') — NOT [...text] or Array.from(text)"`. The plan ALSO required `grep -cE '\[\.\.\.text\]|Array\.from\(text' tests/pdf-bidi.test.js == 0`. These two requirements are mutually exclusive — adding the prescribed explanatory text trips the explanatory-vs-syntactic-gate collision documented as G13 in 23-02 SUMMARY.
- **Fix:** Reworded the header comment to convey the same warning in prose without using the literal forbidden tokens. The new wording: `"do NOT use the spread operator or the codepoint-iterating array conversion"` — same meaning, gate clears.
- **Files modified:** `tests/pdf-bidi.test.js` (in same Task 1 commit, 74c068a).
- **Verification:** Both `grep -c "text.split('')" tests/pdf-bidi.test.js` returns 2 (helper + comment) AND `grep -cE '\[\.\.\.text\]|Array\.from\(text' tests/pdf-bidi.test.js` returns 0.

**2. [Rule 3 — Blocking issue] README missed the literal `phase-23` token (case-sensitive, hyphenated)**

- **Found during:** Task 2 final-verify run (last gate failed).
- **Issue:** The README's first-draft text used "Phase 23" (capitalized, with space) throughout, which is the natural English phrasing — but the plan-prescribed gate is `grep -c 'phase-23' README.md ≥ 1` (case-sensitive, hyphenated). The literal directory-path token `phase-23` was absent from the README's first draft.
- **Fix:** Reworded the README's lead sentence from `"... holds the test fixtures..."` to `"This directory (\`.planning/fixtures/phase-23/\`) holds the test fixtures..."`. The path-reference is naturally informative AND clears the literal-token gate.
- **Files modified:** `.planning/fixtures/phase-23/README.md` (in same Task 2 commit, 69df008).
- **Verification:** `grep -c 'phase-23' .planning/fixtures/phase-23/README.md` returns 1.

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking gate-vs-content collisions of the G13 family from 23-02 SUMMARY).
**Impact on plan:** Both fixes preserved the plan's intent (explanatory comments AND literal grep gates) by rewording prose. No semantic change. No scope creep.

## Issues Encountered

**`Not implemented: HTMLCanvasElement's getContext()` warnings during PDF generation.** JSDOM does not implement Canvas without the `canvas` npm package. jsPDF triggers `getContext()` during init for image-embedding paths, but our text-only fixtures do NOT exercise image embedding, so the warning is benign. The PDFs produce correctly and hashes are stable. Documented in the harness if a future fixture adds images.

## New gotchas discovered during execution

**G15 (new): jsPDF `/CreationDate` cannot be pinned via `setProperties({creationDate})` — only via `setCreationDate(string)`.** The natural-API path (`doc.setProperties({ title, author, creationDate, ... })`) silently drops `creationDate` in jsPDF 2.5.2; jsPDF generates a fresh `new Date()` at output time regardless. The actual pinning API is `doc.setCreationDate()`, and crucially the argument MUST be a pre-formatted PDF date string (e.g. `"D:20260101000000+00'00'"`) — Node `Date` objects fail jsPDF's `instanceof Date` check because jsPDF compares against the JSDOM-window's Date constructor (or whichever Window the doc was constructed in), not Node's globalThis.Date.

**G16 (new): jsPDF `/ID` (PDF trailer file identifier) is non-deterministic and must be pinned via `setFileId('00000000000000000000000000000000')` (32 zero hex chars) for byte-stable output.** Pinning `/CreationDate` alone is insufficient — jsPDF generates a fresh 16-byte file ID on every `output()` call from randomness + timestamp. Without pinning both fields, two back-to-back PDFs produce different SHA-256s even though all content is identical and `/CreationDate` is fixed. This was the missing piece in the plan's Mitigation B description, which only mentioned `/CreationDate`. Adding `setFileId('0' * 32)` to the harness wrapper produced byte-deterministic output.

**G17 (new): `npm install --prefix <dir>` is not honored when a `package.json` exists in any parent directory.** When attempting to install jsdom transiently into `/tmp/jsdom-sandbox`, npm walked up and found a pre-existing `/tmp/package.json` and installed into `/tmp/node_modules/` instead. The `--prefix` flag is silently overridden by the upward-walk behavior. For truly isolated transient installs, either (a) use a non-`/tmp/` location that is guaranteed to have no parent `package.json` or (b) set `npm_config_global=false` and `cd` into the target directory before running `npm install` with no parent flag. Future plans that rely on `--prefix` for sandboxing should be aware.

## User Setup Required

**One-time JSDOM install for the regression harness:**
```bash
mkdir -p /tmp && cd /tmp && npm install jsdom
```
The harness resolves jsdom from `/tmp/node_modules/jsdom`. Override with `JSDOM_PATH=/path/to/jsdom` env var if your environment installs jsdom elsewhere. The `tests/pdf-bidi.test.js` corpus does NOT need jsdom — it runs against pure Node + `assets/bidi.min.js`.

## Next Phase Readiness

Phase 23 is now ready to ship. T1, T2, T3 all have automated coverage:
- **T1 (pure Hebrew RTL)** — verified by bidi corpus vectors #1, #6, #7.
- **T2 (mixed Hebrew + Latin/digits)** — verified by bidi corpus vectors #2, #3, #5, #10.
- **T3 (Latin-only no-regression)** — verified by the SHA-256 baselines on EN/DE/CS fixtures.

Orchestrator may now proceed to optional **Plan 23-05** (footer-centering refactor) or close the phase here. Sapir/Ben's manual UAT round (Hebrew rendering on a real device + Latin visual sanity check) remains held until Wave 3 ships, per 23-02 SUMMARY's hand-off.

## Self-Check: PASSED

- `tests/pdf-bidi.test.js` — created in commit 74c068a. **FOUND** (`git log --oneline tests/pdf-bidi.test.js` → 74c068a).
- `tests/pdf-latin-regression.test.js` — created in commit 69df008. **FOUND**.
- All 6 fixture files (3 JSON + 3 .sha256) — created in commit 69df008. **FOUND** (verified via `git show 69df008 --stat`).
- `.planning/fixtures/phase-23/README.md` — created in commit 69df008. **FOUND**.
- Commit 74c068a — `git log --oneline | grep 74c068a` returns hit. **FOUND**.
- Commit 69df008 — `git log --oneline | grep 69df008` returns hit. **FOUND**.
- All 24 automated gates re-run and confirmed passing (8 Task 1 + 16 Task 2).
- Bidi corpus exits 0 with `Passed 12/12, Failed 0/12.` at re-run time.
- Regression harness exits 0 with `Passed 3/3, Failed 0/3.` against committed baselines at re-run time.
- No file deletions across either commit (`git diff --diff-filter=D --name-only HEAD~2 HEAD` returns empty).
- This SUMMARY file written to `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-04-test-vectors-and-latin-regression-SUMMARY.md`.

---
*Phase: 23-pdf-export-rewrite-hebrew-rtl-and-layout*
*Plan: 23-04*
*Completed: 2026-05-12*
