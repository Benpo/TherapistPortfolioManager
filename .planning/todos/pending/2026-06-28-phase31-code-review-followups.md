---
created: 2026-06-28T08:30:00.000Z
title: Phase 31 code-review advisory follow-ups (WR-01, WR-02, opportunistic cleanups)
area: tech-debt
priority: medium
source: .planning/phases/31-refactor-god-modules/31-REVIEW.md
files:
  - assets/db.js
  - assets/export-modal.js
  - assets/add-session.js
  - assets/settings-snippets.js
  - assets/settings-photos.js
  - assets/version.js
---

Advisory findings from the Phase 31 code review (31-REVIEW.md) that were deliberately NOT fixed in-phase. The one critical finding (CR-01, pooled `openDB()` returned a closed handle after legacy-DB migration) WAS fixed test-first in commit `fc10d46`. These remain:

- **WR-01 (warning) — `openDB()` `onupgradeneeded` catch doesn't null `_dbPromise`.** On an upgrade-migration failure the catch calls `transaction.abort()` + `reject(err)` but relies on `request.onerror` firing afterward to null the pool (`assets/db.js`). Harden by nulling `_dbPromise` in the `onupgradeneeded` catch before `reject`, so pool invalidation doesn't depend on event ordering. Low real-world risk (upgrade-failure only), but cheap and removes fragility.

- **WR-02 (warning) — export-modal helper drift risk.** `assets/export-modal.js` re-derives `copyTextToClipboard`, `getClientNameForCopy`, and `sectionHasData` self-contained (the 5-member ctx handshake couldn't carry them). They are currently behavior-identical to the `assets/add-session.js` originals, but nothing couples the copies — a future edit to one could silently diverge. Fix options: (a) add an anti-drift test asserting equivalence of the two `getClientNameForCopy`/`sectionHasData` implementations, or (b) consolidate the shared helpers into one shared place both files reference. `getClientNameForCopy` is the highest-stakes one (it sources the client name printed in clinical export output).

- **IN-03 (info) — stale `v1.2.0` comment in `assets/version.js`.** APP_VERSION is `1.2.2`; a comment still references `1.2.0`. Natural fit for Phase 32 (README + Code Comments).

- **Deferred RFCT-03 opportunistic cleanups inside the MOVED code** — `var`→`const`/`let` and glue dedup (local `t()`/`getCurrentLang()`/`showToast()` wrappers → `App.t`/`App.showToast`) inside `settings-snippets.js` / `settings-photos.js` were intentionally skipped to keep the Phase 31 extractions byte-for-byte verbatim (the structure-coupled static-source audits scan literal text in the moved regions). Safe to do now that the moves are landed and verified — good candidate to fold into Phase 32 when touching this code for comments.

None of these block anything. Cleanest path: fold IN-03 + the deferred cleanups into Phase 32; handle WR-01 + WR-02 as a small reliability follow-up (or in Phase 32). See [[reference-test-shape-coupling-extractions]] for why the moves were kept verbatim.
