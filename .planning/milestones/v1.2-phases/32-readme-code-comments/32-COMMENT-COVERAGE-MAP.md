# Comment-Coverage Map (D-14)

**Created:** 2026-06-29 · **Phase:** 32 (README + Code Comments) · **Status:** seed artifact (not shipped)

This map flags every production JS module as **done** / **batch-1** / **remaining** for the
DOCS-02 comment work. It is a `.planning/` planning seed — it **seeds the future "comments —
batch 2" phase** (a deferred v1.2 phase). The batch-2 convention is the **pilot convention
established in this phase** (Phase 32): a file-top banner block describing *what it owns ·
public surface (the `window.*` it registers + key handshake) · dependencies (the cross-`window.*`
chain it reads) · key invariants*, plus de-phase-numbering of any `// Phase X Plan Y` /
`// D-NN` archaeology into plain what-it-does text. The reference template is the cleaned
`assets/export-modal.js` header.

**Scope of inventory:** production JS modules only — `assets/*.js` + root `sw.js`. **Excludes**
the `*.min.js` vendor files (`jspdf.min.js`, `jszip.min.js`, `bidi.min.js`) and the i18n
dictionaries (`i18n-en/he/de/cs.js`, `i18n-disclaimer.js`), which are data, not authored logic.

**Status legend:**
- **done (this phase)** — banner written + de-phased in the Phase 32 pilot (5 files).
- **batch-1** — first in line for the comments batch-2 phase. These three were freshly touched
  in the P31 refactor (`overview.js` / `sessions.js` `innerHTML`+i18n hardening; `db.js` openDB
  pooling) → **lowest staleness**, so their banners can be written against current code with least
  re-reading. Start batch-2 here.
- **remaining** — needs a banner in a later batch.

**Header note:** modules flagged **header-less** currently start with code (no file-top comment)
and therefore need a **brand-new banner**, not just a de-phase edit. Per the 2026-06-28 header
scan the header-less production modules are: **`add-session.js`, `add-client.js`, `app.js`,
`db.js`, `reporting.js`, `sessions.js`**. (`add-session.js` was header-less and got its new
banner in this phase.)

## Per-module coverage

| Module | Lines | Status | Header | Notes |
|--------|-------|--------|--------|-------|
| `settings-snippets.js` | 1329 | **done (this phase)** | had rich header | de-phased title + 5 archaeology refs; kept strong cross-IIFE chain doc |
| `settings-photos.js` | 624 | **done (this phase)** | had rich header | de-phased title + 27 inline archaeology refs |
| `export-modal.js` | 803 | **done (this phase)** | clean (convention template) | light de-phase of `RFCT-02` refs; header is the banner reference template |
| `settings.js` | 1014 | **done (this phase)** | had JSDoc header | de-phased (24 refs) + rewritten to slimmed-shape orientation header (snippets/photos extracted out) |
| `add-session.js` | 1518 | **done (this phase)** | **was header-less** | NEW banner from scratch + body de-phase (30 refs) |
| `db.js` | 1154 | **batch-1** | **header-less** | IndexedDB choke-point; freshly touched (openDB pooling). New banner needed. Start batch-2 here. |
| `overview.js` | 734 | **batch-1** | has header | freshly touched (`innerHTML`+i18n hardening). De-phase + refine. |
| `sessions.js` | 198 | **batch-1** | **header-less** | freshly touched (`innerHTML`+i18n hardening). New banner needed. |
| `backup.js` | 1575 | remaining | — | ZIP + AES-256-GCM; large surface |
| `app.js` | 1474 | remaining | **header-less** | core `window.App` (i18n/nav/toasts); new banner needed |
| `pdf-export.js` | 1198 | remaining | — | bidi-aware PDF generation |
| `landing.js` | 762 | remaining | — | marketing page + checkout entry |
| `license.js` | 568 | remaining | has header | activation/validation; header already decent |
| `snippets.js` | 551 | remaining | — | snippet picker UI |
| `backup-modal.js` | 506 | remaining | — | backup options modal |
| `crashlog.js` | 480 | remaining | — | IDB crash-log CRUD |
| `report.js` | 418 | remaining | — | diagnostic page renderer |
| `disclaimer.js` | 357 | remaining | — | legal-page string injection |
| `version.js` | 353 | remaining | well-headed | already well-documented; low priority |
| `snippets-seed.js` | 344 | remaining | — | seed snippet data |
| `crop.js` | 289 | remaining | — | photo crop canvas modal |
| `add-client.js` | 264 | remaining | **header-less** | new banner needed |
| `shared-chrome.js` | 164 | remaining | — | footer/nav chrome |
| `globe-lang.js` | 84 | remaining | — | language picker |
| `md-render.js` | 81 | remaining | — | markdown → HTML/text |
| `reporting.js` | 57 | remaining | **header-less** | thin page module; new banner needed |
| `sw.js` (root) | — | remaining | has header | service worker; precache + cache strategy |
| `i18n.js` | — | remaining | — | loader stub (sets `window.I18N_DEFAULT`); low priority |
| `demo.js` / `demo-hints.js` / `demo-seed.js` | — | remaining | — | **demo group — low priority, stale** (deferred demo-refresh phase); de-prioritize in batch-2 |

`[VERIFIED: ls + wc + header scan, 2026-06-28 — lifted from 32-RESEARCH.md §"Comment-Coverage Map (D-14)"]`

## Roll-up

- **done (this phase):** 5 — `settings-snippets.js`, `settings-photos.js`, `export-modal.js`, `settings.js`, `add-session.js`.
- **batch-1 (next):** 3 — `db.js`, `overview.js`, `sessions.js`.
- **remaining:** the rest (~21 modules + the stale demo group), to be sequenced across later batches.
- **header-less (need a new banner, not just de-phase):** `add-session.js` (done), `add-client.js`, `app.js`, `db.js`, `reporting.js`, `sessions.js`.

This map is the ready seed for the comments batch-2 phase: pick up at the three batch-1 modules,
apply the Phase 32 pilot banner convention, and verify each batch with green `npm test` + the
deterministic comments-only strip-and-compare gate.
