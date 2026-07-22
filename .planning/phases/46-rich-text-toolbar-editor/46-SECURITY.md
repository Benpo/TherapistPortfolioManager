---
phase: 46
slug: rich-text-toolbar-editor
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-22
---

# Phase 46 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| note/export text → toolbar `editInsert` → textarea `.value` | All toolbar mutations route through the single `window.TextEdit.editInsert` execCommand chokepoint (real input event, native undo) — no direct `.value`/`setRangeText` and no innerHTML in `rich-toolbar.js` (grep-gated) | Session note text (sensitive therapy content) |
| note text → `MdRender.render` → live preview pane innerHTML | The toolbar's live preview routes 100% through the escape-first `MdRender.render` — the single sanctioned innerHTML path; textContent fallback when MdRender absent; no raw `innerHTML = rawValue` | Session note text |
| export-step edit text → `MdRender.render` → Step-2 export preview innerHTML | The kept `exportUpdatePreview` renders through the same escape-first sink; the toolbar adds no raw-innerHTML path | Session note text |
| note markdown italic → vendored Rubik-Italic subset → jsPDF | User italic runs draw with a vendored subset Rubik-Italic face registered under family `Heebo`/`italic`; text/vector drawing, no DOM sink; risk is provenance/integrity of the font asset, not injection | Session note text + third-party font asset |
| vendored `rubik-italic-base64.js` → SW precache → PDF export | The font asset ships in-repo, SW-precached, integrity via the deploy-stamped INTEGRITY_TOKEN | Third-party font binary (SIL OFL 1.1) |
| per-field undo history buffer | Rich-toolbar snapshots are held in a bounded per-field buffer (oldest dropped) — memory, not a persistence/exfil surface | Session note text (in memory) |
| automated-green (jsdom) → real-device truth | jsdom has no layout/caret/undo/PDF/RTL engine; the 46-08 / 46-14 / 46-16 human gates + WebKit probes are the boundary where visual/real-device truth is confirmed | Verification evidence |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-46-01a | Tampering | `editInsert` fallback branch | low | mitigate | Fallback splices `.value` and dispatches a real input event exactly as snippets does; pure string ops — no innerHTML, no eval, no injection surface | closed |
| T-46-01b | Denial of Service | `renumberOrderedBlock` on a huge list | low | accept | Scoped to one contiguous block; linear string scans on a single note field, bounded by field length — no pathological regex (AR-46-02) | closed |
| T-46-02a | Tampering | vendored `rubik-italic-base64.js` | high | mitigate | Vendored subset from googlefonts/rubik (SIL OFL 1.1); ships `assets/fonts/rubik-italic-base64.js` + `assets/fonts/rubik.LICENSE.txt`, SW-precached (`sw.js:89`), integrity via deploy-stamped INTEGRITY_TOKEN; loaded on-export via `assets/pdf-export.js:157,280`; provenance verified before encoding | closed |
| T-46-02b | Tampering | `parseInline` join-invariant divergence | high | mitigate | Extended parser keeps the strip-equivalence invariant character-identical to md-render/`stripInlineMarkdown`; the `45-pipeline-agreement` fuzz is the blocking gate — divergence would misplace bold/italic runs after Hebrew bidi reorder | closed |
| T-46-02c | Denial of Service | oversized font payload on export | medium | mitigate | Subset capped (~83.7 KB base64, under the ~90 KB GREEN threshold, D-13 GREEN); font lazy-loads only during export, never at app boot | closed |
| T-46-03a | Tampering / Elevation | toolbar button labels / tooltips | low | mitigate | Tooltips are static i18n strings set via `title`/`textContent`, never innerHTML of user content; buttons are icon-only | closed |
| T-46-03b | Tampering | edits bypassing TextEdit | medium | mitigate | All edits route through `window.TextEdit.editInsert` (execCommand) — no direct `.value`/`setRangeText` in `rich-toolbar.js` (grep-gated) — preserving undo + the RTXT-09 input-event contract | closed |
| T-46-04a | Tampering / Elevation | live preview pane rendering | high | mitigate | 100% of preview rendering routes through `window.MdRender.render` (escape-first, XSS-safe); NO raw `innerHTML = rawValue` — grep-verified; textContent fallback when MdRender absent. V5 output-encoding control | closed |
| T-46-04b | Tampering | auto-renumber rewriting untouched text | medium | mitigate | Renumber scoped to the contiguous ordered block via `TextEdit.renumberOrderedBlock`; applied through `editInsert` so native undo reverts in one step; caret restored | closed |
| T-46-04c | Denial of Service | debounced preview re-render on large notes | low | accept | Preview render is debounced and per-field; MdRender is device-verified on real note sizes (AR-46-02) | closed |
| T-46-05a | Tampering | RTXT-09 composition (snippets/autogrow) | high | mitigate | Toolbar edits go through `TextEdit.editInsert` (real input event); the mount does NOT rewire autoGrow or the snippets binding; verified in a real browser at the 46-08 gate | closed |
| T-46-05b | Tampering / Elevation | read-mode overlay reuse | medium | mitigate | Read mode keeps the single sanctioned `MdRender` innerHTML path (`add-session.js`); the toolbar hides in read mode and adds no second innerHTML sink | closed |
| T-46-06a | Tampering / Elevation | Step-2 preview render | high | mitigate | The kept `exportUpdatePreview` routes through `MdRender.render` (escape-first); the toolbar adds no raw-innerHTML path; V5 output-encoding control preserved | closed |
| T-46-06b | Information Disclosure | ephemeral edits leaking into the saved session | medium | mitigate | Step-2 edits are export-only by existing design (D-03 info note); no new write-back path added | closed |
| T-46-06c | Tampering | script-tag load order | low | mitigate | `text-edit.js` + `rich-toolbar.js` load before `export-modal.js`/`add-session.js` so `window.TextEdit`/`RichToolbar` exist at mount; grep-verified ordering | closed |
| T-46-07a | Information Disclosure | client-served docs content | low | mitigate | Garden register, client/session terminology, no emojis, no internal framing — matches shipped changelog/help conventions; integrity tests gate the shape | closed |
| T-46-07b | Repudiation | docs-gate bypass | low | mitigate | Honest EN changelog + help + `covers[]` edits so the layered docs gate (hook + CI) passes without a skip trailer | closed |
| T-46-08a | Tampering / Elevation | preview + Step-2 render on real WebKit | high | mitigate | 46-08 human gate confirms the escape-first `MdRender` path renders correctly on real Safari; no raw-value innerHTML regression reaches users | closed |
| T-46-08b | Spoofing | false-GREEN jsdom coverage | medium | mitigate | Gate exists precisely because jsdom cannot see caret/undo/PDF/RTL; the checklist drives the real surfaces on real devices | closed |
| T-46-09a | Tampering | undo restore writing the whole field value | medium | mitigate | Restore routes through the existing `editInsert` chokepoint (real input event); no raw innerHTML; preview renders via `MdRender.render` downstream | closed |
| T-46-09b | Denial of Service | unbounded per-field history growth | low | mitigate | History capped to a bounded number of snapshots (oldest dropped) | closed |
| T-46-10a | Information Disclosure | severity block forced into every export | medium | mitigate | The block is opt-out; when excluded it is omitted from BOTH the PDF (empty `issues[]`) and the clipboard copy | closed |
| T-46-10b | Tampering | row label from user-influenced section labels | low | mitigate | Labels set via `textContent` only (existing pattern), never innerHTML | closed |
| T-46-11a | Tampering | snippets open-state accessor | low | mitigate | `isPopoverOpen()` is a read-only additive accessor; no change to snippet detection/expansion (RTXT-09 preserved) | closed |
| T-46-11b | Spoofing | preview label/icon mismatch with state | low | mitigate | `updatePreviewButton` sets icon+label+title+aria together from one state flag | closed |
| T-46-12a | Repudiation / Information Disclosure | ambiguous "No" misread as "not a Heart-Wall session" | medium | mitigate | Boolean replaced with explicit released / identified-not-released copy in both export builders, all four locales | closed |
| T-46-12b | Tampering | accidental change to shared form-radio keys | low | mitigate | New export-only keys added; `shieldRemoved.yes/no` untouched (test asserts builders use the new keys) | closed |
| T-46-13a | Repudiation | undocumented user-facing changes shipping | medium | mitigate | Changelog + help topics updated in the same push; docs-gate confirms | closed |
| T-46-13b | Tampering | bypassing the docs gate | low | accept | No `--no-verify`, no emergency skip; only a valid per-file `Help-Unaffected` trailer where legitimately unaffected (AR-46-03) | closed |
| T-46-14a | Spoofing | false-GREEN jsdom coverage | medium | mitigate | Gate exists because jsdom cannot see undo/caret/PDF/RTL; the checklist drives real surfaces on real devices | closed |
| T-46-14b | Tampering | preview/export render on real WebKit | high | mitigate | 46-14 items confirm the escape-first render + export output on real Safari; no raw-value innerHTML reaches users | closed |
| T-46-15a | Tampering | sticky toolbar overlaying scrolled edit content | medium | mitigate | Pin scoped to `.export-card.is-editor-step .export-edit-area > .rich-toolbar` at `inset-block-start:0` of the edit area only; opaque surface background; no click-steal confirmed at the 46-16 human gate | closed |
| T-46-15b | Denial of Service | min-block-size floor exceeding a short viewport | medium | mitigate | Floor inner-capped `min(640px, 90vh/90dvh)` so it can never exceed the modal max-height on any viewport (probe re-asserts at 1000×700); the `max-width:768px` 100dvh takeover left byte-unchanged | closed |
| T-46-15c | Spoofing | false-GREEN layout coverage (jsdom has no layout engine) | high | mitigate | Fix proven by a Playwright-WebKit probe RED against current source and GREEN after — real layout; the 46-16 human gate re-confirms on real devices + RTL | closed |
| T-46-15d | Information Disclosure | new innerHTML / raw-value surface | low | accept | CSS-only change plus a read-only measurement probe — no new DOM sink, no innerHTML, no user data path (AR-46-04) | closed |
| T-46-16a | Spoofing | false-GREEN jsdom coverage | medium | mitigate | Gate exists because jsdom cannot see layout/flex/sticky/RTL/PDF; the checklist drives real surfaces; 46-15's WebKit probe already caught the layout collapse | closed |
| T-46-16b | Tampering | sticky export toolbar overlaying / stealing clicks | medium | mitigate | Item 12e explicitly checks the pinned bar does not overlay or steal clicks from content beneath it, in LTR and RTL | closed |
| T-46-16c | Tampering | preview/export render on real WebKit | high | mitigate | Items 2/4/5/7 confirm the escape-first render + export output on real Safari; no raw-value innerHTML reaches users | closed |
| T-46-16d | Tampering | round-3 dispatch mis-targeting surviving to a real device | medium | mitigate | Item 13a drives every persistent-toolbar control on first click with no prior focus and confirms it acts on the export editor; 13d confirms note-field dispatch/preview unchanged | closed |
| T-46-17a | Tampering | `_dispatch` mis-targeting (persistent-bar click edits a different field, or shared bar edits the persistent field) | high | mitigate | Target resolved strictly from the clicked control's OWN bar (bar→field reverse map), `_focused` fallthrough only for non-persistent controls; jsdom test asserts persistent-bar Bold edits the persistent field, shared bar still edits `_focused`, and the persistent field is NOT touched by a shared-bar action (explicit mis-targeting guard) | closed |
| T-46-17b | Tampering | preview-reveal scroll disturbs note-field preview / caret / undo | medium | mitigate | Scroll gated to the export edit-area scroll container (persistent field only), offset by sticky-bar height (no bare `scrollIntoView`); note-field preview path takes no scroll action and is not focused/mutated; full jsdom suite stays green; 46-16 items 13b/13d/13e re-confirm | closed |
| T-46-17c | Spoofing | false-GREEN jsdom (no layout engine) for Gap 13 | medium | mitigate | Gap 13's reveal verified by the WebKit probe assertion set E (real layout), RED against current source and GREEN after; 46-16 human gate ratifies on real devices + iPhone + Hebrew | closed |
| T-46-17d | Denial of Service | preview reveal scrolls the whole page instead of the container | low | mitigate | Reveal uses container-scoped vertical scroll (scrollTop math / scoped `scrollIntoView`), never a page-level scroll; the probe measures the pane against the edit-area rect | closed |
| T-46-SC | Tampering | Supply chain: npm/pip installs | high | accept | No SHIPPED package installs (zero-npm app). The one high-rated instance covers the DEV-only asset-production toolchain (`pyftsubset`/`fonttools`, verified at pypi.org before use) used to subset the Rubik-Italic face — not an app dependency. All other plans install nothing. Package Legitimacy Audit verdict: N/A (RESEARCH) (AR-46-01) | closed |

*Status: open · closed — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-46-01 | T-46-SC | Zero SHIPPED package installs across all 17 plans (zero-npm app). The only dev tooling — `pyftsubset`/`fonttools` — is used offline to subset the vendored Rubik-Italic face and verified at pypi.org before use; it is never an app runtime dependency. No supply-chain exposure introduced | plan-time threat model (all 17 plans) | 2026-07-22 |
| AR-46-02 | T-46-01b, T-46-04c | Renumber/preview DoS: transforms are linear scans on a single note field, bounded by field length; preview render is debounced and per-field and device-verified on real note sizes — no pathological complexity | plan-time threat model (46-01, 46-04 PLANs) | 2026-07-22 |
| AR-46-03 | T-46-13b | Docs-gate discipline: shipped with honest EN changelog + help edits and, where legitimately unaffected, a valid per-file `Help-Unaffected` trailer only — never `--no-verify` or an emergency skip | plan-time threat model (46-13 PLAN) | 2026-07-22 |
| AR-46-04 | T-46-15d | The sticky-toolbar work is CSS-only plus a read-only measurement probe — no new DOM sink, no innerHTML, no new user-data path introduced | plan-time threat model (46-15 PLAN) | 2026-07-22 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-22 | 43 | 43 | 0 | /gsd-secure-phase orchestrator (ASVS L1 grep-depth; short-circuit — register authored at plan time, all mitigations evidenced in code/tests/summaries; high-severity controls spot-verified: escape-first `MdRender.render` sole innerHTML sink, `editInsert` chokepoint grep-gate, vendored Rubik-Italic ships + SW-precached + SIL OFL licensed) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-22
