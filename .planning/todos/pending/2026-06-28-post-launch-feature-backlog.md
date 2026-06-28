---
created: 2026-06-28T19:34:00.000Z
title: Post-launch feature backlog (migrated from retired OPEN-ITEMS.md "v2")
area: product-backlog
priority: low
type: backlog
files: []
---

## Context

Migrated from the retired `.planning/OPEN-ITEMS.md` (Sapir's 2026-03-18 Hebrew checklist,
"אחרי השקה — v2" section) during the 2026-06-28 reconciliation. Triaged with Ben:

| Original item | English | Disposition |
|---|---|---|
| VIZ-02 — ייצוא PDF של סיכומי סשנים | PDF export of session summaries | ✅ **Done** — this is the live PDF export (`pdf-export.js`). Not carried forward. |
| FEAT-03 — תבניות סשן / מילוי מהיר | Session templates / quick-fill | ✅ **Done** — this is the snippets feature. Not carried forward. (NB: the separate pending todo `2026-05-13-modality-templates.md` is a *different* thing and stays.) |
| **FEAT-04** — קיצורי מקלדת | Keyboard shortcuts (e.g. quick "new session") | 🔲 **Open** — kept, if scoped to specific power-user shortcuts |
| **VIZ-01** — גרפים של התקדמות מטופלים לאורך זמן | Graphs of patient progress over time | 🔲 Kept as backlog (Ben didn't explicitly confirm done — prune if not pursuing) |
| **PLAT-01** — עטיפה נייטיב למובייל | Native mobile wrapper (if sales justify) | 🔲 Kept as backlog (sales-gated) |
| **PLAT-02** — גיבוי מוצפן לענן (דורש שרת) | Encrypted cloud backup (requires a server) | 🔲 Kept as backlog (server-dependent; distinct from local-IDB-encryption todo `2026-03-24-v12-full-indexeddb-encryption.md`) |

## Open items carried forward

- **FEAT-04 — Keyboard shortcuts:** power-user shortcuts (new session, save, navigation). Open.
- **VIZ-01 — Patient-progress graphs:** visualize a client's progress over time. Backlog.
- **PLAT-01 — Native mobile wrapper:** only "if sales justify it." Backlog.
- **PLAT-02 — Encrypted cloud backup:** needs a server/sync layer — out of scope for the current
  offline-first PWA model. Backlog.

These are low-priority post-launch ideas, not committed roadmap. Promote individually via
`/gsd-review-backlog` if/when pursued.
