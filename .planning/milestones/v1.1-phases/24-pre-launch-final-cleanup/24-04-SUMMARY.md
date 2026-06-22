# Plan 24-04 — Snippet Quick-Paste Engine (Summary)

**Status:** ✅ **SHIPPED + UAT CONFIRMED.** 38 automated test scenarios pass. Browser UAT confirmed by Ben on 2026-05-14 (12/12 scenarios + cell-coverage spot check). One bug surfaced during UAT (seed expansions lacked emotion-name prefix) was fixed in-session and locked with a regression-guard test scenario (G).

**Date shipped:** 2026-05-14

## Commit chain

| Commit | What |
|--------|------|
| `fe6093b` | docs(24-04) — refresh plan against post-Plan-06 codebase + test-coverage table |
| `fdac9b8` | Task 1 — 60-record seed pack + 6-scenario shape test |
| `80f8450` | Task 2 — IDB v5 migration + snippets CRUD + validateSnippetShape + 15 test scenarios (6 migration + 9 validator) |
| `01a6f05` | Task 3 — assets/snippets.js trigger engine + caret popover + 11-scenario regex test + 12-scenario UAT script |
| `d783922` | Task 4 — wire 7 textareas + App.getSnippets sync cache + BroadcastChannel + backup v3 round-trip + sw.js precache + 5-scenario cache test |
| `f96a73b` | chore — bump sw.js CACHE_NAME v122 → v123 (hook skips when sw.js is in the diff) |
| `95ec375` | docs(24-04) — initial SUMMARY |
| `9c161c3` | fix(24-04) — prepend `<Name> — ` to every seed expansion (240 paragraphs) + regression-guard test scenario G; SW v123 → v124 |

## What shipped

1. **IDB v5 additive migration** (assets/db.js) — new `snippets` object store with keyPath `id`, unique index on `trigger`, non-unique index on `origin`. Idempotent seed populate via post-open `seedSnippetsIfNeeded(db)` hook. User-deleted seeds tracked in `therapistSettings.snippetsDeletedSeeds` so they stay deleted across relaunches.
2. **60-record seed pack** (assets/snippets-seed.js, 50KB) — Sapir's Emotion Code chart: 12 cells × 5 emotions × 4-locale (he/en/cs/de) meaning paragraphs. Frozen array; deterministic `ec.<col><row>.<slug>` ids; static timestamps for byte-stable backup diffs. Hebrew copy verbatim from PDF (noun/infinitive form per Ben's session decision).
3. **Snippets CRUD + validator** (assets/db.js) — getAllSnippets, getSnippet, addSnippet, updateSnippet, deleteSnippet (persists deletedSeedIds when origin='seed'), resetSeedSnippet (restores from seed pack + clears the entry). `validateSnippetShape` is exported on the public API for Plan 05 + backup importer.
4. **Trigger engine + caret popover** (assets/snippets.js) — input-event listener on `[data-snippets="true"]` textareas; regex-based trigger detection (anchored, non-greedy, bounded `{1,32}` — ReDoS-safe, verified <50ms on 10k-char adversarial input × 5 iterations); caret-mirror popover positioning; keyboard nav (ArrowUp/Down, Enter, Tab, Esc); locale fallback chain `active → en → he → de → cs` (deduplicated).
5. **App.getSnippets sync cache** (assets/app.js) — mirrors Phase 22's `App.getSectionLabel` shape. Eager-loaded in `initCommon` after therapistSettings; `App.refreshSnippetCache` dispatches `app:snippets-changed` DOM event; BroadcastChannel `snippets-changed` branch added alongside the existing `therapist-settings-changed` handler.
6. **7 session textareas wired** (add-session.html) — `data-snippets="true"` on trappedEmotions, heartShieldEmotions, sessionInsights, limitingBeliefs, additionalTech, sessionComments, customerSummary.
7. **Backup round-trip** (assets/backup.js) — manifest version bumped 2→3, appVersion 1.0→1.1, `manifest.snippets` populated on export, validated row-by-row on import, refreshes the in-memory cache after restore. Pre-v1.1 backups (no `snippets` key) restore cleanly — the v5 migration's seed populate fills the empty store with defaults.
8. **sw.js precache** — `/assets/snippets-seed.js` + `/assets/snippets.js` added to PRECACHE_URLS. CACHE_NAME bumped v122 → v123.

## Test coverage (38 scenarios, all green)

| File | Scenarios | Surface |
|------|-----------|---------|
| `tests/24-04-seed-pack.test.js` | 7 | Frozen array, schema, trigger uniqueness, fallback-chain guarantee, spot-check, tag distribution, emotion-name-prefix regression guard |
| `tests/24-04-shape-validator.test.js` | 9 | Happy path + every rejection branch + unknown-locale tolerance |
| `tests/24-04-idb-migration.test.js` | 6 | Fresh seed, idempotency, deletedSeedIds persistence, resetSeedSnippet, pre-existing data intact, clearAll reseeds |
| `tests/24-04-trigger-regex.test.js` | 11 | Active match, every boundary char, no-boundary-before-prefix rejection, partial-match popover, two-char prefix, locale fallback (active/en/he/de/cs walk), ReDoS timing, hyphenated slug, case-insensitive lookup |
| `tests/24-04-app-cache.test.js` | 5 | Initial empty, refresh load, copy semantics, dispatched DOM event, BroadcastChannel both branches |

**Plan 06 regression:** 7/7 spotlight session-info tests still pass — no async drift introduced.

## UAT confirmed (2026-05-14)

`24-04-UAT.md` 12 scenarios + cell-coverage spot check — all PASS. Bug surfaced + fixed in-session: seed expansions were missing the emotion-name prefix on some entries (e.g., Bitterness en started "A harsh, unpleasant…" with no anchor). Fix shipped in commit `9c161c3` with regression-guard test scenario G. Format applied uniformly to all 240 paragraphs: `<emotion-name-in-locale> — <Sapir's meaning>`.

## Decisions locked this plan

1. **App.getSnippets is sync** (mirrors App.getSectionLabel from Phase 22) — cache is awaited once in `initCommon`, sync everywhere else after. Plan 06's async `populateSpotlight` was async because of a live IDB lookup; snippets read from the eager-loaded cache.
2. **Handwritten in-memory IDB shim** for the migration test (~250 LOC inside the test file) — no `fake-indexeddb` npm install, no `node_modules` introduced. Keeps the project deployable as static files.
3. **snippets.js script tag on add-session.html only** — Plan 05 will add it to settings.html when the Snippets management UI lands. sw.js precaches it now so offline support works the moment Plan 05 wires it.
4. **BroadcastChannel event name = "snippets-changed"** — parallel to the existing "therapist-settings-changed" (verified at assets/app.js BroadcastChannel handler). The original plan said "settings-changed" — that would have collided.

## Anti-pattern protection applied

- Every runtime-behavior task wrote its falsifiable test FIRST and showed actual `node` output before commit (per the 24-01 incident lesson).
- Identifier-resolution chain documented inline for the two scope-crossing surfaces:
  - `window.SNIPPETS_SEED` accessed via explicit `window.` prefix from inside db.js (snippets-seed.js loads BEFORE db.js on every page that opens IDB — verified by grep across 7 HTML pages).
  - `window.App.getSnippets` accessed via explicit `window.` prefix from inside snippets.js (App is in a different IIFE, so the cross-scope reference goes through the namespace).

## What does NOT ship in Plan 04 (Plan 05's scope)

- Settings UI list view, search, tag-filter chips, modal editor.
- Snippet-only JSON import/export buttons + collision modal.
- The user-configurable `snippetPrefix` UI input (engine API `setPrefix` is exposed; UI is in Plan 05).
- snippets.js script tag on settings.html (Plan 05 wires it).

## Next session

Plan 24-04 is fully closed. **Next:** Plan 24-05 (Snippet Settings UI). Depends on the storage + engine + cache infrastructure this plan shipped. After Plan 05 + its UAT, Phase 24 is launch-shape for v1.1.
