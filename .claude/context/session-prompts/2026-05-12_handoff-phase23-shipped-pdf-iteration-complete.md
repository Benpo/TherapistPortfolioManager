# Session Handoff — 2026-05-12

This was a long PDF-rewrite execution + 6 rounds of post-shipping polish based on Ben's visual UAT. The work spans **27 commits on `main`** across 11 plans (23-01 through 23-11). The PDF export now renders Hebrew correctly with proper bidi handling, unified Heebo font for both scripts, bold headings, locale-aware footers, em-dash scale separators, and document-level direction anchoring.

**SW cache:** `sessions-garden-v102` — Ben must hard-refresh (cmd-shift-R on `localhost:8000`) to pick up the new service worker after deploy.

---

## What shipped this session — full chain

### Phase 23 — PDF rewrite (5 plans across 3 waves)
- **23-01** `bf72a97` `7064dfd` — vendored `bidi-js@1.0.3` (12 KB UMD) + sw precache. SW v81→v82.
- **23-02** `c27a853` `11377e4` `f9c2cf2` — bidi pre-shape pipeline + removed all 3 `setR2L(true)` calls. Algorithmic correctness (12/12 test vectors pass). T1/T2 closed.
- **23-03** `9e0d71a` `9572291` — A4 71pt margins + centered title block. T4/T5 closed.
- **23-04** `74c068a` `69df008` `2ac4177` — tests/pdf-bidi.test.js (12 vectors) + tests/pdf-latin-regression.test.js (3 fixtures EN/DE/CS) + deterministic SHA-256 baselines (jsPDF determinism gotchas G15 setCreationDate-string and G16 setFileId discovered). T3 closed (automated).
- **23-05** `0e39bc8` `74a6429` `fea776f` — footer centering refactor (manual-math → `align: 'center'`). Hash drift on all 3 baselines (sub-pt math difference, regenerated cleanly). SW v85→v86.

### Hot-fix waves — Ben's visual UAT exposed real issues that the algorithmic tests didn't catch
- **23-06** `7d95601` `8c8baae` `f1a8f78` `7652fb6` — Phase-23-introduced bug: RTL anchor logic was inherited from setR2L=true world. Without setR2L, jsPDF flows glyphs LTR from x-anchor, so anchoring leftmost-visual at right margin sent text off the right edge. **Fix: `{ align: 'right' }` on RTL `doc.text` calls at 4 sites.** Also removed leaky "Phase 23-01 / 23-CONTEXT D5" comment from sw.js. Added fixture-he.json + baseline (the verification gap that let the bug ship). SW v86→v87.
- **23-07** `e7cd8f9` `8b0fb25` `5413321` `4cc61e7` `2e6fdec` `f5a6ced` — pre-existing font-coverage bug: `NotoSans` covered Latin only, `NotoSansHebrew` covered Hebrew only. jsPDF silently drops chars not in the active font's CMap → mixed Hebrew+Latin lines lost ~half their content. **Fix: replaced both fonts with Heebo Regular** (60 KB single file covering Hebrew + Latin + digits + punct). Net repo delta -60% font weight. New `tests/pdf-glyph-coverage.test.js` regression. SW v87→v89.
- **23-08** `958806f` `19bfe14` `9963b4d` `bff45b4` `9ab33e8` — two bugs: (1) jsPDF's internal `__bidiEngine__` re-processes our pre-shaped visual strings with default `isInputVisual:true`, double-reversing digit runs. **Fix: `{ isInputVisual: false }` on every doc.text call (11 sites).** (2) Markdown `**bold**` markers showed literally. **Fix: new `stripInlineMarkdown()` strips ** and * markers from paragraphs/lists.** New `tests/pdf-digit-order.test.js` regression (proven to catch the bug). SW v89→v91.
- **23-09** `7d21038` `4be8fa1` `0577b5f` `98cd8df` `3c2ff91` `01b978e` `1a50493` `4f041d2` `c28038f` — six polish improvements: i18n the scales text (Before/After/**Change** — "Delta" was too scientific, "שינוי" in HE), i18n the "Page X of Y" footer (HE: עמוד X מתוך Y), removed redundant Client/Date/Type metadata from BOTH markdown builders (clipboard + PDF — caught a follow-up where the PDF goes through a different builder than I initially scoped), vendored Heebo Bold (~111 KB), bold rendering for headings + page-1 title via `drawTextLine(line, y, size, weight)` signature change, bumped heading sizes (H1 16→18, H2 14→16, H3 12→14, line-height 22→26). SW v91→v97.
- **23-10** `2259ec4` `cb98e57` `6bace56` `f9c0c66` — three issues: (1) per-line `isRtl()` anchor caused mixed alignment in same document. **Fix: anchor by document `uiLang` uniformly via `docDir` variable** — Hebrew docs anchor right even on Latin lines, English docs anchor left even on Hebrew lines. Bidi shaping still per-line. `isRtl()` removed entirely as deadcode. (2) Heart shield rendered as bare label line ("מפגש מגננת לב לא") looking like junk text. **Fix: heart shield is now a proper `## section` with bold heading + body content.** (3) Issues heading showed trailing `*` (required-marker leak). **Fix: defensive `stripRequired()` wrapping on all 16 heading sites** (was only on `trapped`). SW v97→v100. Open question: should we add `fixture-he-mixed.json` to lock in docDir-anchor coverage?
- **23-11** `20c1b9e` `9fadaf3` `7a0aac3` — Ben's Google Docs reference revealed UAX-BD16 bracket mirroring was wrong for his use case. **Fix 1: dropped bracket-character mirroring in `shapeForJsPdf`** (chars stay as `(` and `)` instead of being mirrored to `)` and `(`). Position swap from RTL reversal still occurs (standard UAX). **Fix 2: scales format uses em-dash separator instead of brackets** ("- כאבי ראש מוות — לפני: 10, אחרי: 2, שינוי: -8") — bidi-neutral, no bracket reordering issues. Also captured **Clinic-vs-Practice wording bug as a TODO** (`.planning/todos/pending/2026-05-12-session-type-wording-i18n.md`). SW v100→v102.

---

## Verification surface — automated tests on main

| Test file | Status | What it gates |
|---|---|---|
| `tests/pdf-bidi.test.js` | 12/12 | Bidi algorithm correctness for all 12 RESEARCH vectors. Inline `shapeForJsPdf` mirrors the canonical version in pdf-export.js. |
| `tests/pdf-latin-regression.test.js` | 4/4 | EN/DE/CS/HE fixtures hash-match against committed baselines. Deterministic via `setCreationDate(PDF date string)` + `setFileId('00...')` monkey-patch. |
| `tests/pdf-glyph-coverage.test.js` | 3/3 | Mixed Hebrew+Latin line emits glyphs for BOTH scripts (the regression that would've caught 23-07). |
| `tests/pdf-digit-order.test.js` | 4/4 | Digits in RTL paragraphs are NOT reversed (the regression that would've caught 23-08). |

**JSDOM dependency**: transient install at `/tmp/node_modules/jsdom`. Override path with `JSDOM_PATH=...`. Heebo + Heebo Bold + bidi-js + jspdf are all loaded by the harness's `eval` chain.

---

## Open follow-ups (not blocking but worth tracking)

1. **Bracket position swap for user-typed brackets** — even with mirror-character disabled (23-11), brackets in user-typed text inside RTL paragraphs get position-swapped via reversal. `(content)` becomes `)content(` visually. This is standard UAX behavior. Our auto-generated content avoids brackets entirely (em-dash). If users find bracket positions in their typed content distracting, options: (a) Unicode bidi isolate marks around brackets, (b) custom shape that preserves bracket positions, (c) just educate users.
2. **Inline `**X**` bold rendering** — currently 23-08 strips the markers silently. To render bold styling for user-typed `**X**`: need inline-bold parsing + per-segment rendering (split line into bold/regular runs, render each with right font, bidi-aware positioning). Heebo Bold is already vendored (23-09) so the font cost is absorbed. ~80-120 LOC of careful work.
3. **fixture-he-mixed.json regression** — 23-10 changed anchor to `docDir`, but the existing fixtures don't exercise mixed-script content. Add a Hebrew fixture with embedded Latin paragraphs to lock in the docDir behavior. ~10 minutes.
4. **Markdown preview `##` heading bug** — `assets/md-render.js:38`. Pre-existing from Phase 22-03 — block-level heading regex requires no internal newlines, so `## heading\nbody` becomes `<p>## heading<br>body</p>` instead of `<h2>heading</h2><p>body</p>`. Affects only the export-preview pane (the PDF's parseMarkdown is line-based and works correctly). Not Phase 23-related.
5. **Clinic vs Practice wording** — `.planning/todos/pending/2026-05-12-session-type-wording-i18n.md` captures Ben's report.
6. **Single-newline → break in markdown paragraph rendering** — currently parseMarkdown joins consecutive non-blank paragraph lines with space (`paraLines.join(" ")`), so each line wraps as one paragraph. Some users may want each typed line to render as a separate line. Safe to defer until requested.

---

## What was already on the carry-forward list (from 2026-05-11 handoff)

- Phase 22 round-3 trickle is closed (22-13 → 22-15 + 22-14.x inline fix-ups)
- **22-16** — deferred backup architectural rework (3-buttons redesign + missing email attachment for backups). Per the prior handoff: comes AFTER Phase 23. **Phase 23 is now done — 22-16 is the next logical work.**
- Pending UAT items still rolling: N1, N2, N3, N6, N9 from 22-14+22-14.1; N4, N5 from 22-13; N6 referral placeholder from 22-14.2; N11, N12 from 22-15; 22-14.3 placeholder rename propagation. Ben/Sapir should keep testing those — 22-HUMAN-UAT.md tracks them.

---

## Operational reminders

- **Origin/main is the live-app branch and is hundreds of commits behind local main.** Never `git push` without explicit Ben confirmation. The agent worktree runtime branches from origin/main, so worktree isolation is effectively unusable — dispatch executor on local main directly.
- **Pre-commit hook auto-bumps `sw.js` CACHE_NAME on every commit changing `assets/*`.** This is correct and expected behavior. Don't pre-bump manually. Don't bypass with `--no-verify`.
- **UAT follow-up fixes go through gsd-executor sub-agent**, not inline (per `feedback-inline-fixes.md` memory). Reserve inline only for trivial single-token changes.
- **Sessions Garden store ID is 324581.** NEVER touch store 289135 (Sapphire Healing).
- **Hebrew copy convention**: noun/infinitive forms (gender-neutral) — `אפס→איפוס`, `סיים→סיום`, `הורד→הורדה`, `שתף→שיתוף`, `ערוך→עריכה`, `בחר→בחירה`.
- **Date format in dashboard**: always absolute (e.g., `2026-05-12`), never relative ("today", "Thursday").

---

## Recommended next-session opening

1. **Read this doc + `memory/project-dashboard.md` first.**
2. **Dev server**: `lsof -iTCP:8000 -sTCP:LISTEN` to check; `python3 -m http.server 8000 --bind 0.0.0.0` to restart. LAN IP `192.168.178.147` for Sapir.
3. **First action**: ask Ben whether to (a) continue Phase 23 polish (the 6 open follow-ups above), (b) move to 22-16 backup architectural rework, (c) something else. Don't guess.
4. If Phase 23 polish: prioritize follow-up #2 (inline `**X**` bold rendering) — it's the most visible remaining issue and Heebo Bold is already loaded.
5. If 22-16: invoke `/gsd-plan-phase` with phase 22-16 to draft the plan.

Hand off complete. Safe to `/clear`.
