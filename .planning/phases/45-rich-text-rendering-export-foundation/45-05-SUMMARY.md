---
phase: 45-rich-text-rendering-export-foundation
plan: 05
subsystem: tests-and-docs
tags: [rtxt-10, backup-roundtrip, cross-pipeline, d-08, docs-gate, changelog, help, webcrypto, jsdom]
status: complete

# Dependency graph
requires:
  - plan: 01
    provides: "window.MdRender.strip / .render + canonical D-08 emphasis regexes (applyInline)"
  - plan: 02
    provides: "pdf-export __test seam (stripInlineMarkdown / parseInlineBold / parseMarkdown) + char-identical D-08 regexes"
  - plan: 03
    provides: "verbatim copy/share lock (editor.value byte-clean)"
  - plan: 04
    provides: "read-mode overlay + compact strip + md-render.js load-order fix"
provides:
  - "RTXT-10 encrypted .sgbackup encrypt→decrypt→restore byte-identity guard (real WebCrypto + real JSZip, via the BackupManager modal paths)"
  - "Cross-pipeline D-08 agreement guard: MdRender vs pdf-export over a broadened corpus + randomized property pass + char-identical source assertion + nested-list + text-then-list agreement"
  - "EN changelog v1.4 entry + owning EN help topics (docs hard-gate satisfied for the Phase 45 push)"
  - "Staged v1.4.0 changelog structural entry mirrored across he/de/cs (locale-parity gate)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "jsdom + Node WebCrypto (Object.defineProperty on the getter-only window.crypto) + win.setImmediate shim to drive the REAL BackupManager encrypt/decrypt passphrase modals through real JSZip"
    - "Cross-file emphasis-regex identity asserted by extracting /.../g literals from each named function body and comparing pattern source char-for-char"
    - "Deterministic seeded RNG property pass fuzzes parseInlineBold's join-invariant (the only place it is randomized)"

key-files:
  created:
    - tests/45-backup-roundtrip.test.js
    - tests/45-pipeline-agreement.test.js
  modified:
    - assets/changelog-content-en.js
    - assets/changelog-content-he.js
    - assets/changelog-content-de.js
    - assets/changelog-content-cs.js
    - assets/help-content-en.js
    - tests/changelog-integrity.test.js

key-decisions:
  - "APP_VERSION deliberately NOT bumped (stays 1.3.0). The v1.4 semver footer flips at the RELEASE boundary, not mid-milestone (phase 1 of 5), per the version-bump convention — Ben's explicit call at v1.4 ship. The v1.4.0 changelog entry is STAGED ahead of that flip."
  - "The rich-text feature is documented as a NEW v1.4.0 entry (NOT appended to the shipped/tagged/deployed v1.3.0) — attributing a v1.4 feature to v1.3's customer-facing notes would be factually wrong."
  - "backup.js is UNCHANGED: the RTXT-10 test protects a PROPERTY (notes round-trip wholesale via whole-object JSON), it does not add serialization."
  - "The two integration tests are regression-LOCKS over already-shipped Plan 01-04 behavior (green by construction), but genuinely falsifiable — byte-identity ===, crude-strip inequality, char-for-char regex-source compare, exact nested-tag/block assertions."

requirements-completed: [RTXT-06, RTXT-07, RTXT-08, RTXT-10]

# Metrics
duration: 15min
completed: 2026-07-13
tasks: 2
commits: 2
files_changed: 8
---

# Phase 45 Plan 05: Cross-cutting verification + docs hard-gate Summary

**Closed the phase's automated verification and satisfied the Phase 43 docs hard-gate: added the RTXT-10 encrypted-backup round-trip guard (formatted notes survive a real `.sgbackup` encrypt→decrypt→restore byte-for-byte) and the cross-pipeline D-08 agreement guard (MdRender and the PDF renderer proven to agree on inline formatting AND nested lists, with their emphasis regexes proven character-identical at source), then staged the v1.4 "Richer Sessions" EN changelog entry + owning help topics. Full suite green (183/183); docs-gate OK over the phase range.**

## What was built

**Task 1 — integration guards (commit `d9cd144`, test-only)**

- `tests/45-backup-roundtrip.test.js` (RTXT-10 / T-45-08): builds a session whose note fields carry `**bold**`, `*italic*`, a `1.`/`2.` ordered list, a `- ` bullet list, a 2-space nested item, and a `## heading`; drives the REAL `BackupManager.exportEncryptedBackup` (encrypt passphrase modal) → REAL `importBackup` on a `.sgbackup` File (decrypt passphrase modal) through REAL WebCrypto (AES-256-GCM/PBKDF2) and REAL JSZip; asserts each restored note string is BYTE-IDENTICAL (`===`) to the original. Guarded against vacuous pass (asserts a session was actually restored + the fixture carried markers) and against silent stripping (`notStrictEqual` vs a crude-stripped projection — the exact T-45-08 failure). Confirms `backup.js` still serializes via whole-object `JSON.stringify`/`JSON.parse` (test-only; no source change). 3/3 pass.
- `tests/45-pipeline-agreement.test.js` (T-45-03): loads BOTH real renderers into one jsdom window (pdf-export via the `__test` seam). Asserts: (1) `MdRender.strip` ⟺ `stripInlineMarkdown` agree over the BROADENED corpus (pinned rows + `***x***`, `a**b**c`, `un*believable*ly`, `**a *b* c**`, `**2 * 3 * 4**`, Hebrew bold); (2) a 500-string seeded randomized `*`-laced property pass agrees strip-vs-strip AND holds the PDF join-invariant `parseInlineBold(x).map(s=>s.text).join('') === stripInlineMarkdown(x)` (WARNING 4 — the only fuzz of `parseInlineBold` + its inner-italic strip); (3) the emphasis regexes in `md-render.js applyInline` are CHARACTER-IDENTICAL to `pdf-export.js stripInlineMarkdown`'s (regex-literal source extracted from each function body and compared char-for-char), and NEITHER uses lookbehind `(?<`; (4) MdRender's `<strong>` spans ⟺ `parseInlineBold` `bold:true` segments; (5) nested-list agreement (outer + nested tag ⟺ `parseMarkdown` per-item depth+ordered-ness, incl. mixed-type `- a\n  1. b`); (6) text-then-list `Emotions:\n- anger` splits into `<p>` + real `<ul>` and a para block + list block in both pipelines (WARNING 3, no literal `- anger`). 9/9 pass.

**Task 2 — docs hard-gate (commit `55a343f`)**

- `assets/changelog-content-en.js`: new v1.4.0 "Richer Sessions" entry (anchor `v1-4`) — formatted notes render as styled text when reading, export to PDF with Hebrew RTL preserved, and copy/share verbatim. Schema-valid (2-4 highlights, `{new, improved}` categories), no emojis, client/session terminology.
- `assets/changelog-content-{he,de,cs}.js`: the SAME structural v1.4.0 entry mirrored per locale (the `changelog-integrity-locale.test.js` parity gate requires identical version/anchor/category-key skeletons across locales). Translations are faithful but PROVISIONAL — flagged for Ben's review at the v1.4 release.
- `assets/help-content-en.js`: `review-export` topics (`topic-single-export` + `topic-export-formats`) now state the PDF preserves bold/italics/lists/nesting/headings with Hebrew RTL; `starting-a-session/topic-past-sessions` now states reading a saved session shows formatted notes. No new topic (Phase 46 grows it with the editing UI).
- **Executor obligation met (NOTE 8):** `md-render.js` is a docs-gate TRIGGER with no covering help topic (`docs-gate.js` L379-392). The trailer `Help-Unaffected: assets/md-render.js — rendering engine; user-visible change documented under review-export + starting-a-session help topics and the v1.4 changelog entry` is on commit `55a343f` (in the pushed range). `docs-gate.js --base v1.3 --head HEAD` → **OK** (8 help+changelog files, 1 changelog-only, all covered).

## Version-bump decision (FOR BEN)

- v1.3 is shipped (tagged `v1.3`, reachable from the deployed commit, milestone archived). The rich-text feature belongs to the in-progress **v1.4 "Richer Sessions"** milestone (Phase 45 = phase 1 of 5).
- Per the version-bump convention ("the semver footer flips at release boundaries, not per phase; ask Ben the bump question, don't assume"), **APP_VERSION was left at 1.3.0**. The v1.4.0 changelog entry is STAGED — it becomes the What's-New popup source the moment you flip APP_VERSION → 1.4.0 at the v1.4 release. Confirm the v1.4 date at release (currently placeholdered "July 2026", matching v1.3).
- **HE/DE/CS changelog translations are provisional** and warrant your trilingual review before the v1.4 ship.

## Deviations from Plan

### 1. [Rule 3 — blocking] v1.4.0 entry mirrored into he/de/cs changelog files (not in plan `files_modified`)

- **Found during:** Task 2 (full-suite run after the EN changelog edit).
- **Issue:** `tests/changelog-integrity-locale.test.js` enforces version/anchor/category-key PARITY across EN and all three locales. Adding the EN v1.4.0 entry alone broke parity (entry count 5 ≠ 4; version[0] mismatch) → 1 suite failure.
- **Fix:** Added the same structural v1.4.0 entry to `changelog-content-he.js`, `-de.js`, `-cs.js` with faithful (provisional) translations. No emoji / no bidi-control chars / no forbidden clinical terms (locale gate green, 36/36).
- **Files modified:** `assets/changelog-content-{he,de,cs}.js`. **Commit:** `55a343f`.

### 2. [Rule 3 — blocking] changelog-integrity rule 5 pin advanced 1.3.0 → 1.4.0

- **Found during:** Task 2.
- **Issue:** `tests/changelog-integrity.test.js` rule 5 hard-pins the FIRST (latest) entry to `1.3.0`. The staged v1.4.0 entry becomes the new latest → assertion failed.
- **Fix:** Advanced the pin to `1.4.0` (and its error message). The assertion is structurally unchanged (CHLG-04: the newest entry must ship a non-empty highlights array — the popup source). Not a weakening.
- **Files modified:** `tests/changelog-integrity.test.js`. **Commit:** `55a343f`.

### 3. [Design note — within plan latitude, not a deviation] test harness for the encrypted round-trip

- The plan pointed at `snippet-prefix-backup-roundtrip.test.js` (a vm-sandbox with a STUB doc that drives a `.zip` import — no modal). The `.sgbackup` encrypt/decrypt paths BOTH go through the interactive passphrase modal, which a stub doc cannot drive. Used real jsdom instead (real event dispatch), injecting Node WebCrypto via `Object.defineProperty` on the getter-only `window.crypto` and shimming `window.setImmediate` (JSZip's blob generator schedules on it — absent on jsdom's window it hangs `generateAsync`). This exercises the REAL BackupManager modal + WebCrypto + JSZip end-to-end, exactly as the plan's key-link intends.

## Threat surface

- **T-45-08** (backup round-trip silently altering note formatting) — **mitigated**: falsifiable byte-identical round-trip; `backup.js` unchanged.
- **T-45-03** (MdRender / PDF pipeline divergence after parallel D-08 hardening) — **mitigated**: behavior agreement over the broadened corpus + randomized fuzz, AND char-identical source assertion.
- **T-45-SC** (package installs) — **accepted/honored**: zero package installs; no new dependency.
- No new security surface introduced. No threat flags.

## Verification

- `node tests/45-backup-roundtrip.test.js` → 3/3 (exit 0)
- `node tests/45-pipeline-agreement.test.js` → 9/9 (exit 0)
- `node tests/changelog-integrity.test.js` → 10/10 (exit 0); `changelog-integrity-locale.test.js` → 36/36; `help-integrity.test.js` → 14/14
- `node tests/run-all.js` → **183 passed, 0 failed**
- `node scripts/docs-gate.js --base v1.3 --head HEAD` → **docs-gate OK** (all covered)

## Known Stubs

None. (No production source changed by this plan; all note-data surfaces are wired by Plans 01-04.)

## Next Phase Readiness

- Phase 45's automated verification is complete and locked. The remaining gate is **Plan 06** — real-device / real-opened-PDF (Hebrew RTL) visual verification, which jsdom cannot certify.
- At the v1.4 release boundary: flip APP_VERSION → 1.4.0, confirm the v1.4 changelog date, and review the HE/DE/CS translations.

## Self-Check: PASSED

All created/modified files exist on disk; both task commits (`d9cd144`, `55a343f`) present in git history; full suite 183/183; docs-gate OK.

---
*Phase: 45-rich-text-rendering-export-foundation*
*Completed: 2026-07-13*
